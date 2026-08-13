import "server-only";

import { z } from "zod";

import { requireActiveIdentity } from "@/server/auth/authorization";
import { rateLimit } from "@/lib/rate-limit";
import {
  clientAddress,
  opaqueRateLimitKey,
} from "@/lib/request-security";

const MAX_ACTIVE_PER_USER = 2;
const SLOT_TTL_MS = 6 * 60_000;
const activeRequests = new Map<string, { count: number; expiresAt: number }>();

export const safeChatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(30_000),
  })
  .strict();

const providerTokenCountSchema = z
  .number()
  .int()
  .nonnegative()
  .max(100_000_000);

export const openAiCompatiblePayloadSchema = z
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
            message: z
              .object({
                role: z.string().min(1).max(30),
                content: z.string().max(500_000).nullable().optional(),
                reasoning_content: z
                  .string()
                  .max(1_000_000)
                  .nullable()
                  .optional(),
                tool_calls: z
                  .array(
                    z
                      .object({
                        id: z.string().min(1).max(200),
                        type: z.literal("function"),
                        function: z
                          .object({
                            name: z.string().min(1).max(100),
                            arguments: z.string().max(10_000),
                          })
                          .passthrough(),
                      })
                      .passthrough(),
                  )
                  .max(3)
                  .optional(),
              })
              .passthrough(),
          })
          .passthrough(),
      )
      .max(10),
  })
  .passthrough();

export const geminiPayloadSchema = z
  .object({
    usageMetadata: z
      .object({
        promptTokenCount: providerTokenCountSchema.optional(),
        candidatesTokenCount: providerTokenCountSchema.optional(),
      })
      .passthrough()
      .optional(),
    candidates: z
      .array(
        z
          .object({
            content: z
              .object({
                role: z.literal("model").default("model"),
                parts: z
                  .array(
                    z
                      .object({
                        text: z.string().max(200_000).optional(),
                        functionCall: z
                          .object({
                            name: z.string().min(1).max(100),
                            args: z
                              .record(z.string(), z.any())
                              .optional()
                              .default({}),
                          })
                          .passthrough()
                          .optional(),
                      })
                      .passthrough(),
                  )
                  .max(20),
              })
              .passthrough(),
          })
          .passthrough(),
      )
      .max(10),
  })
  .passthrough();

export function assertTotalMessageSize(
  messages: Array<{ content: string }>,
  maxCharacters = 120_000,
) {
  const total = messages.reduce(
    (characters, message) => characters + message.content.length,
    0,
  );
  if (total > maxCharacters) {
    throw new Error("Conversation is too large. Start a new chat and try again.");
  }
}

export function limitAiOutput(content: string, maxCharacters = 30_000) {
  if (content.length <= maxCharacters) return content;
  return `${content.slice(0, maxCharacters)}\n\n[Response truncated]`;
}

export async function authorizeAiRequest(
  provider: string,
  options: {
    proModel?: boolean;
    userRequestsPerMinute?: number;
    addressRequestsPerMinute?: number;
  } = {},
) {
  const identity = await requireActiveIdentity();
  if (
    options.proModel &&
    identity.role !== "admin" &&
    !identity.proModelAccess
  ) {
    throw new Error("Pro model access is required");
  }

  const address = await clientAddress();
  const [userLimit, addressLimit] = await Promise.all([
    rateLimit(
      opaqueRateLimitKey("ai", provider, identity.id),
      options.userRequestsPerMinute ?? 15,
      60_000,
    ),
    rateLimit(
      opaqueRateLimitKey("ai-address", provider, address),
      options.addressRequestsPerMinute ?? 40,
      60_000,
    ),
  ]);
  if (!userLimit.success || !addressLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  return identity;
}

export function acquireAiRequestSlot(userId: string): () => void {
  const now = Date.now();
  const current = activeRequests.get(userId);
  const count = current && current.expiresAt > now ? current.count : 0;
  if (count >= MAX_ACTIVE_PER_USER) {
    throw new Error("Too many AI requests are already running");
  }
  activeRequests.set(userId, {
    count: count + 1,
    expiresAt: now + SLOT_TTL_MS,
  });

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const active = activeRequests.get(userId);
    if (!active) return;
    if (active.count <= 1) activeRequests.delete(userId);
    else activeRequests.set(userId, { ...active, count: active.count - 1 });
  };
}
