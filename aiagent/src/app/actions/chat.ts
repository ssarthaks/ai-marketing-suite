"use server";

import { requireActiveUser } from "@/lib/authz";
import { pool, query } from "@/lib/db";
import { ChatMessage, Thread } from "@/lib/threads";
import { z } from "zod";

const threadIdSchema = z.string().uuid();
const titleSchema = z.string().trim().min(1).max(255);
const projectIdSchema = z
  .string()
  .max(80)
  .regex(/^[A-Za-z0-9_-]+$/)
  .nullable()
  .optional();
const safeAttachmentNameSchema = z
  .string()
  .min(1)
  .max(180)
  .refine(
    (value) =>
      !value.includes("/") &&
      !value.includes("\\") &&
      [...value].every((character) => {
        const code = character.charCodeAt(0);
        return code >= 32 && code !== 127;
      }),
    "Invalid attachment name",
  );
const cloudinaryUrlSchema = z
  .string()
  .url()
  .max(2_048)
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  }, "Invalid attachment URL");
const attachmentSchema = z
  .object({
    id: z.string().uuid(),
    name: safeAttachmentNameSchema,
    type: z.string().min(1).max(100),
    size: z
      .number()
      .int()
      .min(0)
      .max(10 * 1024 * 1024),
    textContent: z.string().max(100_000).optional(),
    previewUrl: cloudinaryUrlSchema.optional(),
    url: cloudinaryUrlSchema.optional(),
  })
  .strict();
const messageSchema = z
  .object({
    id: z.string().uuid(),
    role: z.enum(["user", "assistant"]),
    content: z.string().max(100_000),
    createdAt: z.number().int().min(0).max(4_102_444_800_000),
    attachments: z.array(attachmentSchema).max(5).optional(),
    usage: z
      .object({
        promptTokens: z.number().int().min(0).max(10_000_000),
        completionTokens: z.number().int().min(0).max(10_000_000),
      })
      .strict()
      .optional(),
  })
  .strict();
const messagesSchema = z
  .array(messageSchema)
  .max(200)
  .refine(
    (messages) =>
      new Set(messages.map((message) => message.id)).size === messages.length,
    "Duplicate message identifiers",
  )
  .refine(
    (messages) =>
      messages.reduce(
        (total, message) =>
          total +
          message.content.length +
          (message.attachments ?? []).reduce(
            (attachmentTotal, attachment) =>
              attachmentTotal + (attachment.textContent?.length ?? 0),
            0,
          ),
        0,
      ) <= 500_000,
    "Conversation is too large",
  );

export async function getThreads(): Promise<Thread[]> {
  const user = await requireActiveUser();

  const res = await query(
    "SELECT id, title, title_generated, updated_at, created_at, project_id FROM threads WHERE user_id = $1 ORDER BY updated_at DESC",
    [user.id],
  );

  return res.rows.map((row) => ({
    id: row.id,
    title: row.title,
    titleGenerated: row.title_generated,
    updatedAt: new Date(row.updated_at).getTime(),
    createdAt: new Date(row.created_at).getTime(),
    projectId: row.project_id || undefined,
  }));
}

export async function createThreadRecord(
  threadId: string,
  title: string,
  projectId?: string,
) {
  const user = await requireActiveUser();
  const id = threadIdSchema.parse(threadId);
  const safeTitle = titleSchema.parse(title);
  const safeProjectId = projectIdSchema.parse(projectId);

  const result = await query(
    `INSERT INTO threads (id, user_id, title, project_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [id, user.id, safeTitle, safeProjectId || null],
  );
  if (result.rowCount !== 1) {
    const owned = await query(
      "SELECT 1 FROM threads WHERE id = $1 AND user_id = $2",
      [id, user.id],
    );
    if (owned.rowCount !== 1) throw new Error("Thread already exists");
  }
  return { success: true };
}

export async function updateThreadRecord(
  threadId: string,
  title: string,
  titleGenerated: boolean,
  projectId?: string | null,
) {
  const user = await requireActiveUser();
  const id = threadIdSchema.parse(threadId);
  const safeTitle = titleSchema.parse(title);
  if (typeof titleGenerated !== "boolean") {
    throw new Error("Invalid title state");
  }
  const safeProjectId = projectIdSchema.parse(projectId);

  let result;
  if (projectId !== undefined) {
    result = await query(
      "UPDATE threads SET title = $1, title_generated = $2, project_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5",
      [safeTitle, titleGenerated, safeProjectId, id, user.id],
    );
  } else {
    result = await query(
      "UPDATE threads SET title = $1, title_generated = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4",
      [safeTitle, titleGenerated, id, user.id],
    );
  }
  if (result.rowCount !== 1) throw new Error("Thread not found");
  return { success: true };
}

export async function deleteThreadRecord(threadId: string) {
  const user = await requireActiveUser();
  const id = threadIdSchema.parse(threadId);

  await query("DELETE FROM threads WHERE id = $1 AND user_id = $2", [
    id,
    user.id,
  ]);
  return { success: true };
}

export async function getMessages(threadId: string): Promise<ChatMessage[]> {
  const user = await requireActiveUser();
  const id = threadIdSchema.parse(threadId);

  const res = await query(
    "SELECT m.id, m.role, m.content, m.attachments, m.usage, m.created_at FROM messages m JOIN threads t ON m.thread_id = t.id WHERE m.thread_id = $1 AND t.user_id = $2 ORDER BY m.created_at ASC",
    [id, user.id],
  );

  return res.rows.flatMap((row) => {
    const parsed = messageSchema.safeParse({
      id: row.id,
      role: row.role,
      content: row.content,
      attachments: row.attachments || undefined,
      usage: row.usage || undefined,
      createdAt: new Date(row.created_at).getTime(),
    });
    return parsed.success ? [parsed.data] : [];
  });
}

export async function saveMessagesRecord(
  threadId: string,
  messages: ChatMessage[],
) {
  const user = await requireActiveUser();
  const id = threadIdSchema.parse(threadId);
  const safeMessages = messagesSchema.parse(messages);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const ownedThread = await client.query(
      "SELECT 1 FROM threads WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [id, user.id],
    );
    if (ownedThread.rowCount !== 1) {
      throw new Error("Thread not found");
    }

    for (const message of safeMessages) {
      const result = await client.query(
        `INSERT INTO messages (id, thread_id, role, content, attachments, usage, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0))
         ON CONFLICT (id) DO UPDATE
         SET content = EXCLUDED.content,
             usage = EXCLUDED.usage,
             attachments = EXCLUDED.attachments
         WHERE messages.thread_id = EXCLUDED.thread_id`,
        [
          message.id,
          id,
          message.role,
          message.content,
          message.attachments ? JSON.stringify(message.attachments) : null,
          message.usage ? JSON.stringify(message.usage) : null,
          message.createdAt,
        ],
      );
      if (result.rowCount !== 1) {
        throw new Error("Message identifier conflict");
      }
    }

    await client.query(
      "UPDATE threads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2",
      [id, user.id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { success: true };
}
