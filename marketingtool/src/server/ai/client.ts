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
  model?: string;
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
    model: z.string().optional(),
  })
  .strict();

const tokenCountSchema = z.number().int().nonnegative().max(100_000_000);
const openAiStyleResponseSchema = z
  .object({
    choices: z
      .array(
        z
          .object({
            message: z
              .object({
                content: z.string().max(200_000).optional(),
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
 * Execute chat completion supporting OpenAI, Gemini, Claude, and DeepSeek.
 */
async function runChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions,
  identity: Awaited<ReturnType<typeof authorizeAiRequest>>,
): Promise<ChatCompletionResult> {
  const safeMessages = z.array(completionMessageSchema).min(1).max(12).parse(messages);
  assertTotalMessageSize(safeMessages, 160_000);
  const safeOptions = completionOptionsSchema.parse(options);
  const environment = env();

  // Determine requested provider/model
  const requestedModel = safeOptions.model || process.env.DEFAULT_AI_MODEL || "deepseek-chat";

  let provider: "deepseek" | "openai" | "gemini" | "claude" = "deepseek";
  if (requestedModel.includes("gpt") || requestedModel.includes("openai")) {
    provider = "openai";
  } else if (requestedModel.includes("gemini")) {
    provider = "gemini";
  } else if (requestedModel.includes("claude") || requestedModel.includes("anthropic")) {
    provider = "claude";
  } else {
    provider = "deepseek";
  }

  // Automatic fallback if key for requested provider is missing
  const openAiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_KEY;
  const deepseekKey = environment.DEEPSEEK_API_KEY;

  if (provider === "openai" && !openAiKey) provider = deepseekKey ? "deepseek" : geminiKey ? "gemini" : claudeKey ? "claude" : "openai";
  if (provider === "gemini" && !geminiKey) provider = deepseekKey ? "deepseek" : openAiKey ? "openai" : claudeKey ? "claude" : "gemini";
  if (provider === "claude" && !claudeKey) provider = deepseekKey ? "deepseek" : openAiKey ? "openai" : geminiKey ? "gemini" : "claude";
  if (provider === "deepseek" && !deepseekKey) provider = openAiKey ? "openai" : geminiKey ? "gemini" : claudeKey ? "claude" : "deepseek";

  // Provider Dispatchers
  if (provider === "openai") {
    return runOpenAiCompletion(safeMessages, safeOptions, identity, openAiKey || "");
  } else if (provider === "gemini") {
    return runGeminiCompletion(safeMessages, safeOptions, identity, geminiKey || "");
  } else if (provider === "claude") {
    return runClaudeCompletion(safeMessages, safeOptions, identity, claudeKey || "");
  } else {
    return runDeepSeekCompletion(safeMessages, safeOptions, identity, environment);
  }
}

async function runDeepSeekCompletion(
  safeMessages: ChatMessage[],
  safeOptions: ChatCompletionOptions,
  identity: Awaited<ReturnType<typeof authorizeAiRequest>>,
  environment: ReturnType<typeof env>,
): Promise<ChatCompletionResult> {
  const model = "deepseek-v4-flash";
  let response: Response;
  try {
    response = await fetch(`${environment.DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${environment.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: safeMessages,
        temperature: safeOptions.temperature ?? 0.7,
        max_tokens: safeOptions.maxTokens ?? 4096,
        stream: false,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new AIError("The DeepSeek AI request timed out. Please try again.");
    }
    throw new AIError("Could not reach DeepSeek AI provider. Please check network/key.");
  }

  if (!response.ok) {
    await readResponseText(response, 64 * 1024).catch(() => "");
    throw new AIError(`DeepSeek request failed with status ${response.status}`, response.status);
  }

  const responseText = await readResponseText(response, 2 * 1024 * 1024);
  const data = openAiStyleResponseSchema.parse(JSON.parse(responseText));
  const promptTokens = data.usage?.prompt_tokens ?? 0;
  const completionTokens = data.usage?.completion_tokens ?? 0;

  await recordSharedUsageBestEffort({
    userId: identity.id,
    model,
    promptTokens,
    completionTokens,
  });

  const rawContent = data.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new AIError("DeepSeek returned an empty response.");
  }

  return {
    content: limitAiOutput(rawContent),
    tokensUsed: data.usage?.total_tokens ?? (promptTokens + completionTokens),
    model: data.model ?? model,
  };
}

async function runOpenAiCompletion(
  safeMessages: ChatMessage[],
  safeOptions: ChatCompletionOptions,
  identity: Awaited<ReturnType<typeof authorizeAiRequest>>,
  apiKey: string,
): Promise<ChatCompletionResult> {
  const model = safeOptions.model || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: safeMessages,
      temperature: safeOptions.temperature ?? 0.7,
      max_tokens: safeOptions.maxTokens ?? 4096,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new AIError(`OpenAI request failed with status ${response.status}`, response.status);
  }

  const responseText = await readResponseText(response, 2 * 1024 * 1024);
  const data = openAiStyleResponseSchema.parse(JSON.parse(responseText));
  const promptTokens = data.usage?.prompt_tokens ?? 0;
  const completionTokens = data.usage?.completion_tokens ?? 0;

  await recordSharedUsageBestEffort({
    userId: identity.id,
    model,
    promptTokens,
    completionTokens,
  });

  const rawContent = data.choices?.[0]?.message?.content?.trim();
  if (!rawContent) throw new AIError("OpenAI returned an empty response.");

  return {
    content: limitAiOutput(rawContent),
    tokensUsed: data.usage?.total_tokens ?? (promptTokens + completionTokens),
    model,
  };
}

async function runGeminiCompletion(
  safeMessages: ChatMessage[],
  safeOptions: ChatCompletionOptions,
  identity: Awaited<ReturnType<typeof authorizeAiRequest>>,
  apiKey: string,
): Promise<ChatCompletionResult> {
  const model = "gemini-2.5-flash";
  const systemMsg = safeMessages.find((m) => m.role === "system")?.content || "";
  const contents = safeMessages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
        contents,
        generationConfig: {
          temperature: safeOptions.temperature ?? 0.7,
          maxOutputTokens: safeOptions.maxTokens ?? 4096,
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    throw new AIError(`Gemini request failed with status ${response.status}`, response.status);
  }

  const responseText = await readResponseText(response, 2 * 1024 * 1024);
  const data = JSON.parse(responseText);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new AIError("Gemini returned an empty response.");

  const usage = data?.usageMetadata || {};
  const promptTokens = usage.promptTokenCount || 0;
  const completionTokens = usage.candidatesTokenCount || 0;

  await recordSharedUsageBestEffort({
    userId: identity.id,
    model,
    promptTokens,
    completionTokens,
  });

  return {
    content: limitAiOutput(text),
    tokensUsed: promptTokens + completionTokens,
    model,
  };
}

async function runClaudeCompletion(
  safeMessages: ChatMessage[],
  safeOptions: ChatCompletionOptions,
  identity: Awaited<ReturnType<typeof authorizeAiRequest>>,
  apiKey: string,
): Promise<ChatCompletionResult> {
  const model = "claude-3-5-sonnet-20241022";
  const systemMsg = safeMessages.find((m) => m.role === "system")?.content || "";
  const formattedMessages = safeMessages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: safeOptions.maxTokens ?? 4096,
      temperature: safeOptions.temperature ?? 0.7,
      system: systemMsg,
      messages: formattedMessages,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new AIError(`Claude request failed with status ${response.status}`, response.status);
  }

  const responseText = await readResponseText(response, 2 * 1024 * 1024);
  const data = JSON.parse(responseText);
  const text = data?.content?.find((b: any) => b.type === "text")?.text?.trim();
  if (!text) throw new AIError("Claude returned an empty response.");

  const promptTokens = data?.usage?.input_tokens || 0;
  const completionTokens = data?.usage?.output_tokens || 0;

  await recordSharedUsageBestEffort({
    userId: identity.id,
    model,
    promptTokens,
    completionTokens,
  });

  return {
    content: limitAiOutput(text),
    tokensUsed: promptTokens + completionTokens,
    model,
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
