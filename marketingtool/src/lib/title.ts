"use server";

import { z } from "zod";

import {
  acquireAiRequestSlot,
  authorizeAiRequest,
  safeChatMessageSchema,
} from "@/lib/models/ai-security";
import { readResponseText } from "@/lib/network-security";
import { recordSharedUsageBestEffort } from "@/server/ai/shared-usage";

const TITLE_MODEL = "llama-3.1-8b-instant";
const titleTokenCountSchema = z
  .number()
  .int()
  .nonnegative()
  .max(100_000_000);
const titleResponseSchema = z
  .object({
    choices: z
      .array(
        z
          .object({
            message: z
              .object({
                content: z.string().max(1_000).optional(),
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
        prompt_tokens: titleTokenCountSchema.optional(),
        completion_tokens: titleTokenCountSchema.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export async function generateTitle(
  messages: { role: string; content: string }[],
) {
  const identity = await authorizeAiRequest("title");
  const release = acquireAiRequestSlot(identity.id);

  try {
    const safeMessages = z
      .array(safeChatMessageSchema)
      .max(4)
      .parse(messages);
    if (safeMessages.length === 0) return "New chat";

    const contextMessages = safeMessages.map((message) => ({
      ...message,
      content: message.content.slice(0, 2_000),
    }));

    const prompt = `You are a helpful assistant that generates a short, 3-5 word title for a chat conversation. Return ONLY the title. Do not include quotes, punctuation, or any conversational text.

Conversation so far:
${contextMessages.map((m) => `${m.role}: ${m.content}`).join("\n\n")}

Title:`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TITLE_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 15,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      await readResponseText(res, 32 * 1024).catch(() => "");
      throw new Error("Failed to generate title");
    }

    const json = titleResponseSchema.parse(
      JSON.parse(await readResponseText(res, 256 * 1024)),
    );
    await recordSharedUsageBestEffort({
      userId: identity.id,
      model: TITLE_MODEL,
      promptTokens: json.usage?.prompt_tokens ?? 0,
      completionTokens: json.usage?.completion_tokens ?? 0,
    });
    let title = json.choices?.[0]?.message?.content?.trim() || "New chat";
    title = title
      .replace(/^["']|["']$/g, "")
      .replace(/[\r\n]+/g, " ")
      .trim()
      .slice(0, 80);
    return title || "New chat";
  } catch (error) {
    console.error("Title generation failed");
    return "New chat"; // graceful fallback
  } finally {
    release();
  }
}
