"use server";

import { z } from "zod";
import { searchTool, readerTool } from "../tools";
import { getMarketingSystemPrompt } from "../prompt-generation";
import { formatToolResult, sanitizeModelResponse } from "../utils";

import { query } from "@/lib/db";
import { MODEL_PRICING } from "@/lib/pricing";
import {
  aiRequestSchema,
  authorizeAiRequest,
} from "@/lib/ai-security";

export async function openaiChat({ data }: { data: unknown }) {
  const access = await authorizeAiRequest("openai");
  const raw = z
    .object({
      messages: z.unknown(),
      temperature: z.number().min(0).max(2).optional(),
      model: z.string().optional(),
    })
    .strict()
    .parse(data);
  const conversation = aiRequestSchema.parse({
    messages: raw.messages,
    temperature: raw.temperature,
  });
  const model = raw.model || "gpt-4o-mini";

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY or OPENAI_KEY in server environment.");
  }

  const systemMessage = {
    role: "system",
    content: await getMarketingSystemPrompt(conversation.messages),
  };

  const apiMessages: any[] = [systemMessage, ...conversation.messages];

  const tools = [
    {
      type: "function",
      function: {
        name: "search",
        description: "Search the web for up-to-date marketing data and industry facts.",
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
        name: "reader",
        description: "Extract clean readable text from a target web URL.",
        parameters: {
          type: "object",
          properties: { url: { type: "string" } },
          required: ["url"],
        },
      },
    },
  ];

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let finalContent = "";

  for (let step = 0; step < 5; step++) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.includes("gpt-4o") ? model : "gpt-4o-mini",
        messages: apiMessages,
        temperature: conversation.temperature ?? 0.7,
        max_tokens: 4096,
        tools,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API request failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (payload.usage) {
      totalPromptTokens += payload.usage.prompt_tokens || 0;
      totalCompletionTokens += payload.usage.completion_tokens || 0;
    }

    const msg = payload.choices?.[0]?.message;
    if (!msg) throw new Error("OpenAI API returned an empty response.");

    apiMessages.push(msg);

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      for (const toolCall of msg.tool_calls) {
        let result: any = {};
        const args = toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {};
        if (toolCall.function.name === "search") {
          result = await searchTool(args);
        } else if (toolCall.function.name === "reader") {
          result = await readerTool(args);
        }
        apiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: formatToolResult(toolCall.function.name, result),
        });
      }
    } else {
      finalContent = msg.content || "";
      break;
    }
  }

  try {
    const pricing = MODEL_PRICING[model] || { input: 0.15, output: 0.60 };
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
    console.error("Failed to record usage for OpenAI");
  }

  return {
    content: sanitizeModelResponse(finalContent),
    usage: {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
    },
  };
}
