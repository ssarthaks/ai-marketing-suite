import { z } from "zod";
import { requireActiveUser, type ActiveUser } from "@/lib/authz";
import { rateLimit } from "@/lib/rate-limit";
import { getServerActionClientAddress } from "@/lib/server-security";
import { readTextResponseLimited } from "@/lib/safe-fetch";

const globalForAiConcurrency = globalThis as typeof globalThis & {
  __aiagentAiConcurrency?: Map<string, number>;
};
const activeAiRequests =
  globalForAiConcurrency.__aiagentAiConcurrency ??
  (globalForAiConcurrency.__aiagentAiConcurrency = new Map());

export const clientMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(50_000),
  })
  .strict();

export const aiRequestSchema = z
  .object({
    messages: z.array(clientMessageSchema).min(1).max(50),
    temperature: z.number().min(0).max(2).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.messages.reduce(
        (total, message) => total + message.content.length,
        0,
      ) <= 100_000,
    "Conversation context is too large",
  );

const providerTokenCountSchema = z
  .number()
  .int()
  .nonnegative()
  .max(100_000_000);

export const chatCompletionToolCallSchema = z
  .object({
    id: z.string().min(1).max(200),
    type: z.literal("function"),
    function: z
      .object({
        name: z.string().min(1).max(100),
        arguments: z.string().max(4_000),
      })
      .passthrough(),
  })
  .passthrough();

export const chatCompletionMessageSchema = z
  .object({
    role: z.string().min(1).max(30),
    content: z.string().max(500_000).nullable().optional(),
    reasoning_content: z.string().max(1_000_000).nullable().optional(),
    tool_calls: z.array(chatCompletionToolCallSchema).max(5).optional(),
  })
  .passthrough();

export const chatCompletionPayloadSchema = z
  .object({
    usage: z
      .object({
        prompt_tokens: providerTokenCountSchema.optional(),
        completion_tokens: providerTokenCountSchema.optional(),
      })
      .passthrough()
      .optional(),
    choices: z
      .array(
        z
          .object({
            message: chatCompletionMessageSchema.optional(),
          })
          .passthrough(),
      )
      .max(10)
      .optional(),
  })
  .passthrough();

export type ChatCompletionToolCall = z.infer<
  typeof chatCompletionToolCallSchema
>;
export type ChatCompletionMessage = z.infer<typeof chatCompletionMessageSchema>;

export async function authorizeAiRequest(provider: string): Promise<{
  user: ActiveUser;
  release: () => void;
}> {
  const user = await requireActiveUser();
  const clientAddress = await getServerActionClientAddress();
  const [providerLimit, userLimit, sourceLimit] = await Promise.all([
    rateLimit(`ai:${provider}:user:${user.id}`, 10, 60_000),
    rateLimit(`ai:all:user:${user.id}`, 20, 60_000),
    rateLimit(`ai:all:source:${clientAddress}`, 100, 60_000),
  ]);
  if (!providerLimit.success || !userLimit.success || !sourceLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const current = activeAiRequests.get(user.id) ?? 0;
  if (current >= 2) {
    throw new Error("Too many concurrent AI requests.");
  }
  activeAiRequests.set(user.id, current + 1);

  let released = false;
  return {
    user,
    release: () => {
      if (released) return;
      released = true;
      const remaining = (activeAiRequests.get(user.id) ?? 1) - 1;
      if (remaining <= 0) activeAiRequests.delete(user.id);
      else activeAiRequests.set(user.id, remaining);
    },
  };
}

export async function readProviderJson(
  response: Response,
  providerName: string,
): Promise<unknown> {
  const body = await readTextResponseLimited(response, 4 * 1024 * 1024);
  let payload: unknown = {};
  try {
    payload = body ? JSON.parse(body) : {};
  } catch {
    if (response.ok) throw new Error(`${providerName} returned invalid data`);
  }
  if (!response.ok) {
    console.error(`${providerName} request failed`, {
      status: response.status,
    });
    if (response.status === 401) {
      throw new Error(`${providerName} rejected the configured API key.`);
    }
    if (response.status === 402) {
      throw new Error(`${providerName} account balance is exhausted.`);
    }
    if (response.status === 429) {
      throw new Error(
        `${providerName} is temporarily busy. Please try again shortly.`,
      );
    }
    if (response.status >= 500) {
      throw new Error(
        `${providerName} is temporarily unavailable. Please try again shortly.`,
      );
    }
    throw new Error(`${providerName} request failed.`);
  }
  return payload;
}

export const MODEL_FETCH_OPTIONS = {
  timeoutMs: 60_000,
  maxToolSteps: 5,
} as const;
