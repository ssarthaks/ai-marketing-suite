"use server";

import { z } from "zod";

import { pool, query } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { opaqueRateLimitKey } from "@/lib/request-security";
import { getSharedUserId } from "@/server/shared-user";
import type { ChatMessage, Thread } from "@/lib/threads";

const idSchema = z.string().uuid();
const titleSchema = z.string().trim().min(1).max(200);
const attachmentUrlSchema = z
  .string()
  .url()
  .max(2_048)
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.hostname === "res.cloudinary.com"
    );
  }, "Unsupported attachment URL");
const attachmentSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(255),
    type: z
      .string()
      .max(128)
      .regex(/^[A-Za-z0-9.+-]+\/[A-Za-z0-9.+-]+$/),
    size: z
      .number()
      .int()
      .min(0)
      .max(25 * 1024 * 1024),
    textContent: z.string().max(50_000).optional(),
    previewUrl: attachmentUrlSchema.optional(),
    url: attachmentUrlSchema.optional(),
  })
  .strict();
const usageSchema = z
  .object({
    promptTokens: z.number().int().min(0).max(10_000_000),
    completionTokens: z.number().int().min(0).max(10_000_000),
  })
  .strict();
const messageSchema = z
  .object({
    id: idSchema,
    role: z.enum(["user", "assistant"]),
    content: z.string().max(30_000),
    createdAt: z.number().int().min(1_577_836_800_000),
    attachments: z.array(attachmentSchema).max(10).optional(),
    usage: usageSchema.optional(),
  })
  .strict();
const messagesSchema = z.array(messageSchema).max(100);

function validateMessages(input: ChatMessage[]) {
  const messages = messagesSchema.parse(input);
  if (messages.some((message) => message.createdAt > Date.now() + 5 * 60_000)) {
    throw new Error("Invalid message timestamp");
  }
  if (JSON.stringify(messages).length > 500_000) {
    throw new Error("Conversation is too large to save");
  }
  return messages;
}

export async function getThreads(): Promise<Thread[]> {
  const sharedUserId = await getSharedUserId();
  if (!sharedUserId) return [];

  const result = await query(
    `SELECT id, title, title_generated, updated_at, created_at
     FROM threads
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 200`,
    [sharedUserId],
  );

  return result.rows.flatMap((row) => {
    const parsed = z
      .object({
        id: idSchema,
        title: titleSchema,
        titleGenerated: z.boolean().optional(),
        updatedAt: z.number().int(),
        createdAt: z.number().int(),
      })
      .safeParse({
        id: row.id,
        title: row.title,
        titleGenerated: Boolean(row.title_generated),
        updatedAt: new Date(row.updated_at).getTime(),
        createdAt: new Date(row.created_at).getTime(),
      });
    return parsed.success ? [parsed.data] : [];
  });
}

export async function createThreadRecord(threadId: string, title: string) {
  const sharedUserId = await getSharedUserId();
  if (!sharedUserId) throw new Error("Unauthorized");
  const safeThreadId = idSchema.parse(threadId);
  const safeTitle = titleSchema.parse(title);

  const result = await query(
    `INSERT INTO threads (id, user_id, title)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [safeThreadId, sharedUserId, safeTitle],
  );
  if (result.rowCount !== 1) {
    throw new Error("Unable to create thread");
  }
  return { success: true };
}

export async function updateThreadRecord(
  threadId: string,
  title: string,
  titleGenerated: boolean,
) {
  const sharedUserId = await getSharedUserId();
  if (!sharedUserId) throw new Error("Unauthorized");
  const safeThreadId = idSchema.parse(threadId);
  const safeTitle = titleSchema.parse(title);
  const safeTitleGenerated = z.boolean().parse(titleGenerated);

  const result = await query(
    `UPDATE threads
     SET title = $1, title_generated = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 AND user_id = $4`,
    [safeTitle, safeTitleGenerated, safeThreadId, sharedUserId],
  );
  if (result.rowCount !== 1) throw new Error("Thread not found");
  return { success: true };
}

export async function deleteThreadRecord(threadId: string) {
  const sharedUserId = await getSharedUserId();
  if (!sharedUserId) throw new Error("Unauthorized");
  const safeThreadId = idSchema.parse(threadId);

  await query("DELETE FROM threads WHERE id = $1 AND user_id = $2", [
    safeThreadId,
    sharedUserId,
  ]);
  return { success: true };
}

export async function getMessages(threadId: string): Promise<ChatMessage[]> {
  const sharedUserId = await getSharedUserId();
  if (!sharedUserId) return [];
  const safeThreadId = idSchema.parse(threadId);

  const result = await query(
    `SELECT m.id, m.role, m.content, m.attachments, m.usage, m.created_at
     FROM messages m
     JOIN threads t ON m.thread_id = t.id
     WHERE m.thread_id = $1 AND t.user_id = $2
     ORDER BY m.created_at ASC
     LIMIT 100`,
    [safeThreadId, sharedUserId],
  );

  return result.rows.flatMap((row) => {
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
  const sharedUserId = await getSharedUserId();
  if (!sharedUserId) throw new Error("Unauthorized");
  const safeThreadId = idSchema.parse(threadId);
  const safeMessages = validateMessages(messages);

  const limit = await rateLimit(
    opaqueRateLimitKey("chat-save", sharedUserId),
    120,
    60_000,
  );
  if (!limit.success) {
    throw new Error("Too many save requests. Please try again shortly.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const owner = await client.query(
      `SELECT 1
       FROM threads
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [safeThreadId, sharedUserId],
    );
    if (owner.rowCount !== 1) throw new Error("Thread not found");

    for (const message of safeMessages) {
      const result = await client.query(
        `INSERT INTO messages
           (id, thread_id, role, content, attachments, usage, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0))
         ON CONFLICT (id) DO UPDATE
           SET content = EXCLUDED.content,
               usage = EXCLUDED.usage,
               attachments = EXCLUDED.attachments
           WHERE messages.thread_id = EXCLUDED.thread_id
         RETURNING id`,
        [
          message.id,
          safeThreadId,
          message.role,
          message.content,
          message.attachments ? JSON.stringify(message.attachments) : null,
          message.usage ? JSON.stringify(message.usage) : null,
          message.createdAt,
        ],
      );
      if (result.rowCount !== 1) {
        throw new Error("Message identifier conflicts with another thread");
      }
    }

    await client.query(
      `UPDATE threads
       SET updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2`,
      [safeThreadId, sharedUserId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  return { success: true };
}
