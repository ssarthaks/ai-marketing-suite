"use server";

import { z } from "zod";
import {
  webSearchTool,
  webScrapeTool,
  jinaReaderTool,
  redditSearchTool,
  youtubeTranscriptTool,
} from "../tools";
import { getMarketingSystemPrompt } from "../prompt-generation";
import { formatToolResult, sanitizeModelResponse } from "../utils";

import {
  acquireAiRequestSlot,
  assertTotalMessageSize,
  authorizeAiRequest,
  limitAiOutput,
  openAiCompatiblePayloadSchema,
  safeChatMessageSchema,
} from "./ai-security";
import { readResponseText } from "@/lib/network-security";
import { recordSharedUsageBestEffort } from "@/server/ai/shared-usage";

const studioModelSchema = z.enum([
  "deepseek-v4-flash",
  "deepseek-v4-pro",
]);
type StudioModel = z.infer<typeof studioModelSchema>;

const MAX_AGENT_STEPS = 12;
const AI_STUDIO_DEADLINE_MS = 285_000;
const FINAL_SYNTHESIS_RESERVE_MS = 120_000;
const MIN_RESEARCH_STEP_BUDGET_MS = 5_000;
const PROVIDER_REQUEST_TIMEOUT_MS = 270_000;
const PROVIDER_RETRY_DELAYS_MS = [750, 1_500, 3_000] as const;
const RETRYABLE_PROVIDER_STATUSES = new Set([429, 500, 502, 503, 504]);

class ProviderTimeoutError extends Error {
  constructor() {
    super("The AI request did not finish in time. Please try again.");
    this.name = "ProviderTimeoutError";
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function retryAfterMilliseconds(value: string | null): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1_000, 10_000);
  }

  const date = Date.parse(value);
  if (!Number.isNaN(date)) {
    return Math.min(Math.max(0, date - Date.now()), 10_000);
  }

  return null;
}

async function requestDeepseekCompletion({
  apiKey,
  model,
  messages,
  tools,
  temperature,
  userId,
  deadline,
}: {
  apiKey: string;
  model: StudioModel;
  messages: unknown[];
  tools?: unknown[];
  temperature?: number;
  userId: string;
  deadline: number;
}): Promise<z.infer<typeof openAiCompatiblePayloadSchema>> {
  const isPro = model === "deepseek-v4-pro";
  const requestBody = {
    model,
    messages,
    user_id: userId,
    ...(isPro
      ? {
          thinking: { type: "enabled" },
          reasoning_effort: "max",
          max_tokens: 128_000,
        }
      : {
          thinking: { type: "disabled" },
          temperature: temperature ?? 0.7,
          max_tokens: 32_000,
        }),
    ...(tools ? { tools } : {}),
  };

  for (let attempt = 0; attempt <= PROVIDER_RETRY_DELAYS_MS.length; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 2_000) {
      throw new ProviderTimeoutError();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      Math.min(PROVIDER_REQUEST_TIMEOUT_MS, remaining - 1_000),
    );

    let response: Response;
    let responseText: string;
    try {
      response = await fetch(
        "https://api.deepseek.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify(requestBody),
        },
      );
      responseText = await readResponseText(response, 4 * 1024 * 1024);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Response is too large"
      ) {
        throw new Error("DeepSeek returned an unexpectedly large response.");
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new ProviderTimeoutError();
      }
      const canRetry =
        attempt < PROVIDER_RETRY_DELAYS_MS.length &&
        deadline - Date.now() > PROVIDER_RETRY_DELAYS_MS[attempt] + 2_000;
      if (canRetry) {
        await wait(PROVIDER_RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw new Error(
        "Could not reach DeepSeek after several automatic retries.",
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const canRetry =
        RETRYABLE_PROVIDER_STATUSES.has(response.status) &&
        attempt < PROVIDER_RETRY_DELAYS_MS.length;
      if (canRetry) {
        const delay =
          retryAfterMilliseconds(response.headers.get("retry-after")) ??
          PROVIDER_RETRY_DELAYS_MS[attempt];
        if (deadline - Date.now() > delay + 2_000) {
          await wait(delay);
          continue;
        }
      }

      console.error(
        `[ai] DeepSeek request failed with status ${response.status}`,
      );
      if (response.status === 401) {
        throw new Error("DeepSeek rejected the configured API key.");
      }
      if (response.status === 402) {
        throw new Error(
          "The DeepSeek account balance is exhausted. Please top it up and retry.",
        );
      }
      if (response.status === 429) {
        throw new Error(
          "DeepSeek is temporarily busy after several automatic retries. Please try again shortly.",
        );
      }
      if (response.status >= 500) {
        throw new Error(
          "DeepSeek is temporarily unavailable after several automatic retries.",
        );
      }
      throw new Error(`DeepSeek API request failed (${response.status}).`);
    }

    let rawPayload: unknown;
    try {
      rawPayload = JSON.parse(responseText);
    } catch {
      throw new Error("DeepSeek returned an invalid response.");
    }

    const payload = openAiCompatiblePayloadSchema.safeParse(rawPayload);
    if (!payload.success) {
      throw new Error("DeepSeek returned an invalid response.");
    }
    await recordSharedUsageBestEffort({
      userId,
      model,
      promptTokens: payload.data.usage?.prompt_tokens ?? 0,
      completionTokens: payload.data.usage?.completion_tokens ?? 0,
    });
    return payload.data;
  }

  throw new Error("DeepSeek is temporarily unavailable.");
}

async function runDeepseekChat({
  data,
}: {
  data: { messages: any[]; temperature?: number; model?: string };
}, identity: Awaited<ReturnType<typeof authorizeAiRequest>>) {
  // Validate input
  const validated = z
    .object({
      messages: z.array(safeChatMessageSchema).min(1).max(40),
      temperature: z.number().min(0).max(2).optional(),
      model: studioModelSchema.optional(),
    })
    .strict()
    .parse(data);
  assertTotalMessageSize(validated.messages);

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY in server environment.");
  }

  const systemMessage = {
    role: "system",
    content: await getMarketingSystemPrompt(validated.messages),
  };

  const apiMessages = [systemMessage, ...validated.messages];

  const tools = [
    {
      type: "function",
      function: {
        name: "webSearchTool",
        description:
          "Search the web for information to assist with product marketing research.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query" },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "webScrapeTool",
        description:
          "Scrape and extract raw text content from a web page/URL using a basic scraper.",
        parameters: {
          type: "object",
          properties: { url: { type: "string" } },
          required: ["url"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "jinaReaderTool",
        description:
          "Extract clean, perfect Markdown from any URL using Jina.ai. Bypasses bot protection. Use this over webScrapeTool when possible.",
        parameters: {
          type: "object",
          properties: { url: { type: "string" } },
          required: ["url"],
        },
      },
    },

    {
      type: "function",
      function: {
        name: "redditSearchTool",
        description:
          "Search Reddit for customer pain points, complaints, or discussions. Use for deep customer research.",
        parameters: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "youtubeTranscriptTool",
        description: "Fetch the full text transcript of any YouTube video URL.",
        parameters: {
          type: "object",
          properties: { url: { type: "string" } },
          required: ["url"],
        },
      },
    },

    {
      type: "function",
      function: {
        name: "generateMarketingFilesTool",
        description: "Generate marketing copy/artifacts for a product.",
        parameters: {
          type: "object",
          properties: {
            projectName: { type: "string" },
            agentContent: { type: "string" },
            skills: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  content: { type: "string" },
                },
                required: ["name", "description", "content"],
              },
            },
            evalsJson: { type: "string" },
          },
          required: ["projectName", "agentContent", "skills", "evalsJson"],
        },
      },
    },
  ];

  const currentMessages: any[] = [...apiMessages];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  const model = validated.model ?? "deepseek-v4-flash";
  const deadline = Date.now() + AI_STUDIO_DEADLINE_MS;
  const researchDeadline = deadline - FINAL_SYNTHESIS_RESERVE_MS;

  for (let step = 0; step < MAX_AGENT_STEPS; step++) {
    if (researchDeadline - Date.now() < MIN_RESEARCH_STEP_BUDGET_MS) {
      break;
    }

    let payload: z.infer<typeof openAiCompatiblePayloadSchema>;
    try {
      payload = await requestDeepseekCompletion({
        apiKey,
        model,
        messages: currentMessages,
        tools,
        temperature: validated.temperature,
        userId: identity.id,
        deadline: researchDeadline,
      });
    } catch (error) {
      if (error instanceof ProviderTimeoutError) break;
      throw error;
    }

    if (payload.usage) {
      totalPromptTokens += payload.usage.prompt_tokens || 0;
      totalCompletionTokens += payload.usage.completion_tokens || 0;
    }

    const providerMessage = payload.choices?.[0]?.message;
    if (!providerMessage) {
      throw new Error("DeepSeek API returned an empty response.");
    }
    const message = {
      ...providerMessage,
      content: providerMessage.content ?? "",
    };

    currentMessages.push(message);

    if (message.tool_calls && message.tool_calls.length > 0) {
      if (message.tool_calls.length > 3) {
        throw new Error("The AI requested too many tools at once");
      }
      for (const toolCall of message.tool_calls) {
        if (toolCall.type === "function") {
          const serializedArgs = toolCall.function.arguments;
          const args =
            typeof serializedArgs === "string" &&
            serializedArgs.length <= 10_000
              ? JSON.parse(serializedArgs)
              : {};
          let result: any;

          if (toolCall.function.name === "webSearchTool") {
            result = await webSearchTool(args);
          } else if (toolCall.function.name === "webScrapeTool") {
            result = await webScrapeTool(args);
          } else if (toolCall.function.name === "jinaReaderTool") {
            result = await jinaReaderTool(args);
          } else if (toolCall.function.name === "redditSearchTool") {
            result = await redditSearchTool(args);
          } else if (toolCall.function.name === "youtubeTranscriptTool") {
            result = await youtubeTranscriptTool(args);
          }

          currentMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: formatToolResult(toolCall.function.name, result),
          });
        }
      }
    } else {
      return {
        content: limitAiOutput(
          sanitizeModelResponse(message.content || "Done executing tools."),
        ),
        usage: {
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
        },
      };
    }
  }

  const finalPayload = await requestDeepseekCompletion({
    apiKey,
    model,
    messages: currentMessages,
    temperature: validated.temperature,
    userId: identity.id,
    deadline,
  });
  if (finalPayload.usage) {
    totalPromptTokens += finalPayload.usage.prompt_tokens || 0;
    totalCompletionTokens += finalPayload.usage.completion_tokens || 0;
  }
  const finalContent = finalPayload.choices?.[0]?.message?.content?.trim();
  if (!finalContent) {
    throw new Error("DeepSeek API returned an empty final response.");
  }

  return {
    content: limitAiOutput(sanitizeModelResponse(finalContent)),
    usage: {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
    },
  };
}

export async function deepseekChat(args: {
  data: { messages: any[]; temperature?: number; model?: string };
}) {
  const identity = await authorizeAiRequest("deepseek", {
    proModel: args.data?.model === "deepseek-v4-pro",
    // This is an abuse-only ceiling, not a normal-use product quota.
    userRequestsPerMinute: 120,
    addressRequestsPerMinute: 600,
  });
  const release = acquireAiRequestSlot(identity.id);
  try {
    return await runDeepseekChat(args, identity);
  } finally {
    release();
  }
}
