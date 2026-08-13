"use server";

import { z } from "zod";
import { searchTool, readerTool } from "../tools";
import { getMarketingSystemPrompt } from "../prompt-generation";
import { formatToolResult, sanitizeModelResponse } from "../utils";

import { MODEL_PRICING } from "@/lib/pricing";
import { aiRequestSchema, authorizeAiRequest } from "@/lib/ai-security";

export async function claudeChat({ data }: { data: unknown }) {
  const access = await authorizeAiRequest("claude");
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
  const model = raw.model || "claude-3-5-sonnet-20241022";

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY or CLAUDE_KEY in server environment.");
  }

  const systemPrompt = await getMarketingSystemPrompt(conversation.messages);

  const formattedMessages = conversation.messages.map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

  const tools = [
    {
      name: "search",
      description: "Search the web for up-to-date marketing data and industry facts.",
      input_schema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
    {
      name: "reader",
      description: "Extract clean readable text from a target web URL.",
      input_schema: {
        type: "object",
        properties: { url: { type: "string" } },
        required: ["url"],
      },
    },
  ];

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let finalContent = "";
  const currentMessages: any[] = [...formattedMessages];

  for (let step = 0; step < 5; step++) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: model.includes("haiku") ? "claude-3-5-haiku-20241022" : "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        temperature: conversation.temperature ?? 0.7,
        system: systemPrompt,
        messages: currentMessages,
        tools,
      }),
      signal: AbortSignal.timeout(35_000),
    });

    if (!response.ok) {
      throw new Error(`Anthropic Claude request failed (${response.status})`);
    }

    const payload = await response.json();
    if (payload.usage) {
      totalPromptTokens += payload.usage.input_tokens || 0;
      totalCompletionTokens += payload.usage.output_tokens || 0;
    }

    const contentBlocks = payload.content || [];
    const textBlock = contentBlocks.find((b: any) => b.type === "text");
    const toolUseBlocks = contentBlocks.filter((b: any) => b.type === "tool_use");

    if (toolUseBlocks.length > 0) {
      currentMessages.push({ role: "assistant", content: contentBlocks });
      const toolResults = [];
      for (const toolUse of toolUseBlocks) {
        let result: any = {};
        if (toolUse.name === "search") {
          result = await searchTool(toolUse.input || {});
        } else if (toolUse.name === "reader") {
          result = await readerTool(toolUse.input || {});
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: formatToolResult(toolUse.name, result),
        });
      }
      currentMessages.push({ role: "user", content: toolResults });
    } else {
      finalContent = textBlock?.text || "";
      break;
    }
  }

  const pricing = MODEL_PRICING[model] || { input: 3.0, output: 15.0 };
  const cost = (totalPromptTokens / 1_000_000) * pricing.input + (totalCompletionTokens / 1_000_000) * pricing.output;

  return {
    model,
    content: sanitizeModelResponse(finalContent),
    tokens: {
      prompt: totalPromptTokens,
      completion: totalCompletionTokens,
      total: totalPromptTokens + totalCompletionTokens,
    },
    costUsd: cost,
  };
}
