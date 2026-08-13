"use server";

import { z } from "zod";
import {
  extractTool,
  readerTool,
  redditSearchTool,
  searchTool,
  siteCrawlTool,
  toToolFailure,
  youtubeTranscriptTool,
} from "../tools";
import { ToolExecutionCache } from "../tools/cache";
import { getMarketingSystemPrompt } from "../prompt-generation";
import { formatToolResult, sanitizeModelResponse } from "../utils";

import { query } from "@/lib/db";
import { MODEL_PRICING } from "@/lib/pricing";
import {
  aiRequestSchema,
  authorizeAiRequest,
  chatCompletionPayloadSchema,
  type ChatCompletionMessage,
  readProviderJson,
} from "@/lib/ai-security";

type ConversationMessage = ChatCompletionMessage & {
  tool_call_id?: string;
  name?: string;
};

const studioModelSchema = z.enum(["deepseek-v4-flash", "deepseek-v4-pro"]);
type StudioModel = z.infer<typeof studioModelSchema>;

const MAX_AGENT_STEPS = 8;
const AI_REQUEST_DEADLINE_MS = 285_000;
const FINAL_SYNTHESIS_RESERVE_MS = 120_000;
const MIN_RESEARCH_STEP_BUDGET_MS = 5_000;
const PROVIDER_REQUEST_TIMEOUT_MS = 270_000;
const PROVIDER_RETRY_DELAYS_MS = [750, 1_500, 3_000] as const;
const RETRYABLE_PROVIDER_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ACCEPTED_TOOL_OUTPUT_CHARACTERS = 55_000;
const TOOL_CALL_LIMITS: Readonly<Record<string, number>> = {
  search: 4,
  reader: 3,
  extract: 5,
  redditSearch: 2,
  youtubeTranscript: 2,
  siteCrawl: 1,
};

async function executeResearchTool(
  name: string,
  input: unknown,
  deadline: number,
): Promise<unknown> {
  const remainingMilliseconds = deadline - Date.now();
  if (remainingMilliseconds <= 0) {
    return {
      error: {
        code: "TIMEOUT",
        message: "The research deadline was reached before this tool ran.",
        retryable: true,
      },
    };
  }

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<unknown>((resolve) => {
    timeout = setTimeout(() => {
      controller.abort();
      resolve({
        error: {
          code: "TIMEOUT",
          message: "The research tool exceeded the remaining time budget.",
          retryable: true,
        },
      });
    }, remainingMilliseconds);
  });
  const execution = (async (): Promise<unknown> => {
    try {
      switch (name) {
        case "search":
          return await searchTool(input);
        case "reader":
          return await readerTool(input);
        case "extract":
          return await extractTool(input);
        case "redditSearch":
          return await redditSearchTool(input);
        case "youtubeTranscript":
          return await youtubeTranscriptTool(input);
        case "siteCrawl":
          return await siteCrawlTool(input, { signal: controller.signal });
        default:
          return {
            error: {
              code: "INVALID_INPUT",
              message: "Unsupported research tool.",
              retryable: false,
            },
          };
      }
    } catch (error) {
      return toToolFailure(error);
    }
  })();

  try {
    return await Promise.race([execution, timedOut]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

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
  return Number.isNaN(date)
    ? null
    : Math.min(Math.max(0, date - Date.now()), 10_000);
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
  messages: ConversationMessage[];
  tools?: unknown[];
  temperature?: number;
  userId: string;
  deadline: number;
}): Promise<z.infer<typeof chatCompletionPayloadSchema>> {
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
    if (remaining <= 2_000) throw new ProviderTimeoutError();

    let response: Response;
    try {
      response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(
          Math.min(PROVIDER_REQUEST_TIMEOUT_MS, remaining - 1_000),
        ),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError")
      ) {
        throw new ProviderTimeoutError();
      }
      const delay = PROVIDER_RETRY_DELAYS_MS[attempt];
      if (delay !== undefined && deadline - Date.now() > delay + 2_000) {
        await wait(delay);
        continue;
      }
      throw new Error(
        "Could not reach DeepSeek after several automatic retries.",
      );
    }

    if (
      RETRYABLE_PROVIDER_STATUSES.has(response.status) &&
      attempt < PROVIDER_RETRY_DELAYS_MS.length
    ) {
      const delay =
        retryAfterMilliseconds(response.headers.get("retry-after")) ??
        PROVIDER_RETRY_DELAYS_MS[attempt];
      if (deadline - Date.now() > delay + 2_000) {
        await response.body?.cancel().catch(() => undefined);
        await wait(delay);
        continue;
      }
    }

    return chatCompletionPayloadSchema.parse(
      await readProviderJson(response, "DeepSeek"),
    );
  }

  throw new Error("DeepSeek is temporarily unavailable.");
}

export async function deepseekChat({ data }: { data: unknown }) {
  const access = await authorizeAiRequest("deepseek");
  try {
    const raw = z
      .object({
        messages: z.unknown(),
        temperature: z.number().min(0).max(2).optional(),
        model: studioModelSchema.optional(),
      })
      .strict()
      .parse(data);
    const conversation = aiRequestSchema.parse({
      messages: raw.messages,
      temperature: raw.temperature,
    });
    const validated = {
      ...conversation,
      model: raw.model ?? "deepseek-v4-flash",
    };
    if (
      validated.model === "deepseek-v4-pro" &&
      access.user.role !== "admin" &&
      !access.user.proModelAccess
    ) {
      throw new Error("Pro model access is required");
    }

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
          name: "search",
          description:
            "Search first. Returns at most five concise {title,url,snippet} objects. Use snippets directly when they answer the question; do not read result pages by default.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "One specific search query, maximum 300 characters.",
              },
            },
            required: ["query"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "reader",
          description:
            "Read one page as clean Markdown, capped at 4000 characters. Use only when the complete source is needed and search snippets are insufficient.",
          parameters: {
            type: "object",
            properties: { url: { type: "string" } },
            required: ["url"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "extract",
          description:
            "Extract only the requested section or fact from one page. Prefer this over reader for pricing, policies, features, contact details, or another narrow question.",
          parameters: {
            type: "object",
            properties: {
              url: { type: "string" },
              instruction: {
                type: "string",
                description: "A narrow request such as 'Extract pricing'.",
              },
            },
            required: ["url", "instruction"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "redditSearch",
          description:
            "Find public Reddit threads through free web search, then read them with Jina or bounded HTML parsing. Optional evidence source; empty results are not a pipeline failure.",
          parameters: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "youtubeTranscript",
          description:
            "Fetch a YouTube transcript, capped at 15000 characters. Use only for a specific video supplied or selected for analysis.",
          parameters: {
            type: "object",
            properties: {
              url: { type: "string" },
              language: {
                type: "string",
                description: "Optional language code such as en or en-US.",
              },
            },
            required: ["url"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "siteCrawl",
          description:
            "Crawl a same-origin site while respecting robots.txt. Use only when the user explicitly asks for a multi-page crawl or site-wide audit.",
          parameters: {
            type: "object",
            properties: {
              rootUrl: { type: "string" },
              maxDepth: {
                type: "integer",
                minimum: 0,
                maximum: 3,
                default: 1,
              },
              maxPages: {
                type: "integer",
                minimum: 1,
                maximum: 20,
                default: 5,
              },
            },
            required: ["rootUrl"],
            additionalProperties: false,
          },
        },
      },
    ];

    const currentMessages: ConversationMessage[] = [...apiMessages];
    const toolResultCache = new ToolExecutionCache();
    const toolCallCounts = new Map<string, number>();
    let totalToolOutputCharacters = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    const deadline = Date.now() + AI_REQUEST_DEADLINE_MS;
    const researchDeadline = deadline - FINAL_SYNTHESIS_RESERVE_MS;

    for (let step = 0; step < MAX_AGENT_STEPS; step++) {
      if (researchDeadline - Date.now() < MIN_RESEARCH_STEP_BUDGET_MS) {
        break;
      }

      let payload: z.infer<typeof chatCompletionPayloadSchema>;
      try {
        payload = await requestDeepseekCompletion({
          apiKey,
          model: validated.model,
          messages: currentMessages,
          tools,
          temperature: validated.temperature,
          userId: access.user.id,
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
        const executedTools = await Promise.all(
          message.tool_calls.slice(0, 5).map(async (toolCall) => {
            if (
              toolCall.type !== "function" ||
              typeof toolCall.function?.arguments !== "string" ||
              toolCall.function.arguments.length > 4_000
            ) {
              return {
                name: toolCall.function?.name || "invalid",
                toolCallId: toolCall.id,
                result: {
                  error: {
                    code: "INVALID_INPUT",
                    message: "Invalid tool request.",
                    retryable: false,
                  },
                },
              };
            }

            let args: unknown;
            try {
              args = JSON.parse(toolCall.function.arguments);
            } catch {
              args = null;
            }
            if (args === null) {
              return {
                name: toolCall.function.name,
                toolCallId: toolCall.id,
                result: {
                  error: {
                    code: "INVALID_INPUT",
                    message: "Tool arguments must be valid JSON.",
                    retryable: false,
                  },
                },
              };
            }

            const callLimit = TOOL_CALL_LIMITS[toolCall.function.name];
            if (callLimit !== undefined) {
              const callCount = toolCallCounts.get(toolCall.function.name) || 0;
              if (callCount >= callLimit) {
                return {
                  name: toolCall.function.name,
                  toolCallId: toolCall.id,
                  result: {
                    error: {
                      code: "BUDGET_EXHAUSTED",
                      message: `The ${toolCall.function.name} call limit was reached; synthesize from existing evidence.`,
                      retryable: false,
                    },
                  },
                };
              }
              toolCallCounts.set(toolCall.function.name, callCount + 1);
            }

            const result = await toolResultCache.run(
              toolCall.function.name,
              args,
              () =>
                executeResearchTool(
                  toolCall.function.name,
                  args,
                  researchDeadline,
                ),
            );

            return {
              name: toolCall.function.name,
              toolCallId: toolCall.id,
              result,
            };
          }),
        );
        const toolMessages = executedTools.map(
          ({ name, toolCallId, result }) => {
            let content = formatToolResult(name, result);
            if (
              totalToolOutputCharacters + content.length >
              MAX_ACCEPTED_TOOL_OUTPUT_CHARACTERS
            ) {
              content = formatToolResult(name, {
                error: {
                  code: "BUDGET_EXHAUSTED",
                  message:
                    "The research output budget was reached; synthesize from existing evidence.",
                  retryable: false,
                },
              });
            }
            totalToolOutputCharacters += content.length;
            return {
              role: "tool",
              tool_call_id: toolCallId,
              name,
              content,
            } satisfies ConversationMessage;
          },
        );
        currentMessages.push(...toolMessages);
      } else {
        try {
          const pricing = MODEL_PRICING[validated.model] || {
            input: 0,
            output: 0,
          };
          const inputCost = (totalPromptTokens / 1_000_000) * pricing.input;
          const outputCost =
            (totalCompletionTokens / 1_000_000) * pricing.output;
          const totalCost = inputCost + outputCost;

          if (totalPromptTokens > 0 || totalCompletionTokens > 0) {
            await query(
              "UPDATE users SET total_input_tokens = COALESCE(total_input_tokens, 0) + $1, total_output_tokens = COALESCE(total_output_tokens, 0) + $2, total_cost = COALESCE(total_cost, 0) + $3 WHERE id = $4",
              [
                totalPromptTokens,
                totalCompletionTokens,
                totalCost,
                access.user.id,
              ],
            );
          }
        } catch {
          console.error("Failed to record usage");
        }

        return {
          content: sanitizeModelResponse(
            message.content || "Done executing tools.",
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
      model: validated.model,
      messages: currentMessages,
      temperature: validated.temperature,
      userId: access.user.id,
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

    try {
      const pricing = MODEL_PRICING[validated.model] || {
        input: 0,
        output: 0,
      };
      const inputCost = (totalPromptTokens / 1_000_000) * pricing.input;
      const outputCost = (totalCompletionTokens / 1_000_000) * pricing.output;
      const totalCost = inputCost + outputCost;

      if (totalPromptTokens > 0 || totalCompletionTokens > 0) {
        await query(
          "UPDATE users SET total_input_tokens = COALESCE(total_input_tokens, 0) + $1, total_output_tokens = COALESCE(total_output_tokens, 0) + $2, total_cost = COALESCE(total_cost, 0) + $3 WHERE id = $4",
          [totalPromptTokens, totalCompletionTokens, totalCost, access.user.id],
        );
      }
    } catch {
      console.error("Failed to record usage");
    }

    return {
      content: sanitizeModelResponse(finalContent),
      usage: {
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
      },
    };
  } finally {
    access.release();
  }
}
