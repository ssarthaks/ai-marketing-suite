"use server";

import { z } from "zod";
import { searchTool, readerTool } from "../tools";
import { getMarketingSystemPrompt } from "../prompt-generation";
import { formatToolResult, sanitizeModelResponse } from "../utils";

import { query } from "@/lib/db";
import { MODEL_PRICING } from "@/lib/pricing";
import { aiRequestSchema, authorizeAiRequest } from "@/lib/ai-security";

export async function geminiChat({ data }: { data: unknown }) {
  const access = await authorizeAiRequest("gemini");
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
  const model = raw.model || "gemini-2.5-flash";

  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY or GEMINI_KEY in server environment.");
  }

  const systemPrompt = await getMarketingSystemPrompt(conversation.messages);

  const contents = conversation.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        contents,
        generationConfig: {
          temperature: conversation.temperature ?? 0.7,
          maxOutputTokens: 4096,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    }
  );

  if (!response.ok) {
    throw new Error(`Google Gemini API request failed (${response.status})`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  const usage = payload?.usageMetadata || {};
  const promptTokens = usage.promptTokenCount || 0;
  const completionTokens = usage.candidatesTokenCount || 0;

  try {
    const pricing = MODEL_PRICING[model] || { input: 0.15, output: 0.60 };
    const inputCost = (promptTokens / 1_000_000) * pricing.input;
    const outputCost = (completionTokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;

    if (promptTokens > 0 || completionTokens > 0) {
      await query(
        "UPDATE users SET total_input_tokens = COALESCE(total_input_tokens, 0) + $1, total_output_tokens = COALESCE(total_output_tokens, 0) + $2, total_cost = COALESCE(total_cost, 0) + $3 WHERE id = $4",
        [promptTokens, completionTokens, totalCost, access.user.id],
      );
    }
  } catch {
    console.error("Failed to record usage for Gemini");
  }

  return {
    content: sanitizeModelResponse(text),
    usage: {
      promptTokens: promptTokens,
      completionTokens: completionTokens,
    },
  };
}
