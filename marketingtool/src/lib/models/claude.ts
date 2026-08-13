"use server";

import { z } from "zod";
import { webSearchTool, webScrapeTool } from "../tools";
import { getMarketingSystemPrompt } from "../prompt-generation";
import { formatToolResult, sanitizeModelResponse } from "../utils";

import {
  acquireAiRequestSlot,
  assertTotalMessageSize,
  authorizeAiRequest,
  limitAiOutput,
  safeChatMessageSchema,
} from "./ai-security";
import { readResponseText } from "@/lib/network-security";
import { recordSharedUsageBestEffort } from "@/server/ai/shared-usage";

const claudeResponseSchema = z
  .object({
    id: z.string().optional(),
    type: z.string().optional(),
    role: z.string().optional(),
    model: z.string().optional(),
    content: z
      .array(
        z
          .object({
            type: z.string(),
            text: z.string().optional(),
            id: z.string().optional(),
            name: z.string().optional(),
            input: z.any().optional(),
          })
          .passthrough()
      )
      .optional(),
    stop_reason: z.string().nullable().optional(),
    usage: z
      .object({
        input_tokens: z.number().optional(),
        output_tokens: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

async function runClaudeChat(
  {
    data,
  }: {
    data: { messages: any[]; temperature?: number; model?: string };
  },
  identity: Awaited<ReturnType<typeof authorizeAiRequest>>
) {
  const validated = z
    .object({
      messages: z.array(safeChatMessageSchema).min(1).max(40),
      temperature: z.number().min(0).max(2).optional(),
      model: z.string().optional(),
    })
    .strict()
    .parse(data);
  assertTotalMessageSize(validated.messages);

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY or CLAUDE_KEY in server environment.");
  }

  const systemPrompt = await getMarketingSystemPrompt(validated.messages);
  const selectedModel = validated.model || "claude-3-5-sonnet-20241022";

  // Filter messages into user and assistant roles only
  const formattedMessages = validated.messages.map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

  const tools = [
    {
      name: "webSearchTool",
      description: "Search the web for information to assist with product marketing research.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" },
        },
        required: ["query"],
      },
    },
    {
      name: "webScrapeTool",
      description: "Scrape and extract raw text content from a web page/URL.",
      input_schema: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL of the web page to scrape" },
        },
        required: ["url"],
      },
    },
  ];

  const currentMessages: any[] = [...formattedMessages];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  for (let step = 0; step < 4; step++) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 4096,
        temperature: validated.temperature ?? 0.7,
        system: systemPrompt,
        messages: currentMessages,
        tools: tools,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    const responseText = await readResponseText(response, 2 * 1024 * 1024).catch(() => "{}");

    if (!response.ok) {
      console.error(`[ai] Anthropic Claude request failed (${response.status}): ${responseText.slice(0, 300)}`);
      throw new Error(`Anthropic Claude request failed (${response.status})`);
    }

    let payload: z.infer<typeof claudeResponseSchema>;
    try {
      payload = claudeResponseSchema.parse(JSON.parse(responseText));
    } catch {
      throw new Error("Anthropic Claude API returned an invalid response schema.");
    }

    if (payload.usage) {
      totalPromptTokens += payload.usage.input_tokens || 0;
      totalCompletionTokens += payload.usage.output_tokens || 0;
    }

    await recordSharedUsageBestEffort({
      userId: identity.id,
      model: selectedModel,
      promptTokens: payload.usage?.input_tokens ?? 0,
      completionTokens: payload.usage?.output_tokens ?? 0,
    });

    const contentBlocks = payload.content || [];
    const textBlock = contentBlocks.find((b) => b.type === "text");
    const toolUseBlocks = contentBlocks.filter((b) => b.type === "tool_use");

    if (toolUseBlocks.length > 0) {
      // Add assistant response to messages
      currentMessages.push({
        role: "assistant",
        content: contentBlocks,
      });

      const toolResults = [];
      for (const toolUse of toolUseBlocks) {
        const args = toolUse.input || {};
        let result: any = {};
        if (toolUse.name === "webSearchTool") {
          result = await webSearchTool(args);
        } else if (toolUse.name === "webScrapeTool") {
          result = await webScrapeTool(args);
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: formatToolResult(toolUse.name || "tool", result),
        });
      }

      currentMessages.push({
        role: "user",
        content: toolResults,
      });
    } else {
      const finalResultText = textBlock?.text || "Completed request.";
      return {
        content: limitAiOutput(sanitizeModelResponse(finalResultText)),
        usage: {
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
        },
      };
    }
  }

  const lastMsg = currentMessages[currentMessages.length - 1];
  const textOutput = typeof lastMsg?.content === "string" ? lastMsg.content : "Reached maximum execution steps.";

  return {
    content: limitAiOutput(sanitizeModelResponse(textOutput)),
    usage: {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
    },
  };
}

export async function claudeChat(args: {
  data: { messages: any[]; temperature?: number; model?: string };
}) {
  const identity = await authorizeAiRequest("claude");
  const release = acquireAiRequestSlot(identity.id);
  try {
    return await runClaudeChat(args, identity);
  } finally {
    release();
  }
}
