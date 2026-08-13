"use server";

import { z } from "zod";
import { authorizeAiRequest } from "@/lib/ai-security";

const titleMessagesSchema = z
  .array(
    z
      .object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(5_000),
      })
      .strict(),
  )
  .min(1)
  .max(50);

export async function generateTitle(
  messages: { role: string; content: string }[],
) {
  const access = await authorizeAiRequest("title");
  try {
    const safeMessages = titleMessagesSchema.parse(messages);
    const firstUserMessage = safeMessages.find(
      (message) => message.role === "user",
    )?.content;
    if (!firstUserMessage) return "New chat";

    const stopWords = new Set([
      "a",
      "an",
      "and",
      "can",
      "could",
      "for",
      "help",
      "i",
      "in",
      "is",
      "me",
      "my",
      "of",
      "on",
      "please",
      "the",
      "to",
      "want",
      "with",
      "would",
      "you",
    ]);
    const words =
      firstUserMessage
        .slice(0, 500)
        .match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)
        ?.filter((word) => !stopWords.has(word.toLocaleLowerCase()))
        .slice(0, 5) || [];
    if (words.length === 0) return "New chat";
    return words
      .map((word) =>
        word === word.toLocaleLowerCase()
          ? word.charAt(0).toLocaleUpperCase() + word.slice(1)
          : word,
      )
      .join(" ");
  } finally {
    access.release();
  }
}
