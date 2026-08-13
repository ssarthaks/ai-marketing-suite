import "server-only";

import { z } from "zod";

import { env } from "@/lib/env";
import {
  acquireAiRequestSlot,
  assertTotalMessageSize,
  authorizeAiRequest,
  limitAiOutput,
} from "@/lib/models/ai-security";
import { readResponseText } from "@/lib/network-security";
import { recordSharedUsageBestEffort } from "./shared-usage";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResult {
  content: string;
  tokensUsed: number | null;
  model: string;
}

export class AIError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "AIError";
  }
}

const REQUEST_TIMEOUT_MS = 90_000;
const completionMessageSchema = z
  .object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string().min(1).max(80_000),
  })
  .strict();
const completionOptionsSchema = z
  .object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(1).max(4_096).optional(),
  })
  .strict();

const tokenCountSchema = z.number().int().nonnegative().max(100_000_000);
const deepSeekResponseSchema = z
  .object({
    choices: z
      .array(
        z
          .object({
            message: z
              .object({
                content: z.string().max(200_000),
              })
              .passthrough()
              .optional(),
          })
          .passthrough(),
      )
      .max(10)
      .optional(),
    usage: z
      .object({
        prompt_tokens: tokenCountSchema.optional(),
        completion_tokens: tokenCountSchema.optional(),
        total_tokens: tokenCountSchema.optional(),
      })
      .passthrough()
      .optional(),
    model: z.string().min(1).max(100).optional(),
  })
  .passthrough();

/**
 * Thin client for the DeepSeek chat completions API (OpenAI-compatible).
 * All higher-level logic (prompts, persistence) lives in the AI service.
 */
async function runChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions,
  identity: Awaited<ReturnType<typeof authorizeAiRequest>>,
): Promise<ChatCompletionResult> {
  const safeMessages = z.array(completionMessageSchema).min(1).max(12).parse(messages);
  assertTotalMessageSize(safeMessages, 160_000);
  const safeOptions = completionOptionsSchema.parse(options);
  const { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL } = env();
  const model = "deepseek-v4-flash";

  let response: Response;
  try {
    response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: safeMessages,
        thinking: { type: "disabled" },
        temperature: safeOptions.temperature ?? 0.7,
        max_tokens: safeOptions.maxTokens ?? 4096,
        stream: false,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new AIError("The AI request timed out. Please try again.");
    }
    throw new AIError("Could not reach the AI provider. Please try again.");
  }

  if (!response.ok) {
    await readResponseText(response, 64 * 1024).catch(() => "");
    console.error(`[ai] DeepSeek request failed with status ${response.status}`);
    if (response.status === 401) {
      throw new AIError("AI provider rejected the API key.", 401);
    }
    if (response.status === 429) {
      throw new AIError(
        "AI provider rate limit reached. Try again in a moment.",
        429
      );
    }
    throw new AIError("The AI provider returned an error.", response.status);
  }

  const responseText = await readResponseText(response, 2 * 1024 * 1024);
  let data: z.infer<typeof deepSeekResponseSchema>;
  try {
    data = deepSeekResponseSchema.parse(JSON.parse(responseText));
  } catch {
    throw new AIError("The AI provider returned an invalid response.");
  }
  const promptTokens = data.usage?.prompt_tokens ?? 0;
  const completionTokens = data.usage?.completion_tokens ?? 0;
  await recordSharedUsageBestEffort({
    userId: identity.id,
    // Cost uses the requested product model, matching the AI Agent ledger.
    model,
    promptTokens,
    completionTokens,
  });

  const rawContent = data.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new AIError("The AI returned an empty response. Please try again.");
  }
  const content = limitAiOutput(rawContent);

  return {
    content,
    tokensUsed:
      data.usage?.total_tokens ??
      (data.usage ? promptTokens + completionTokens : null),
    model: data.model ?? model,
  };
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
): Promise<ChatCompletionResult> {
  const identity = await authorizeAiRequest("content-generation");
  const release = acquireAiRequestSlot(identity.id);
  try {
    return await runChatCompletion(messages, options, identity);
  } finally {
    release();
  }
}
