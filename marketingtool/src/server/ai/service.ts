import "server-only";

import { CONTENT_TYPE_LABELS } from "@/lib/constants";
import { chatCompletion, type ChatCompletionResult } from "./client";
import { buildMessages, type PromptContext } from "./prompts";

export type GenerationResult = ChatCompletionResult;

/**
 * The single entry point for AI content generation.
 * Components and actions never call the AI client directly.
 */
export async function generateMarketingContent(
  context: PromptContext
): Promise<GenerationResult> {
  const messages = buildMessages(context);
  return chatCompletion(messages, {
    // Slightly higher creativity for social content, tighter for structured output.
    temperature:
      context.type === "SEO_META" ||
      context.type === "KEYWORDS" ||
      context.type === "GOOGLE_ADS"
        ? 0.5
        : 0.8,
  });
}

/** Human-readable default title, e.g. "Blog Post — Launch announcement for…" */
export function deriveTitle(context: PromptContext): string {
  const label = CONTENT_TYPE_LABELS[context.type] ?? context.type;
  const snippet = context.prompt.replace(/\s+/g, " ").trim().slice(0, 60);
  const ellipsis = context.prompt.trim().length > 60 ? "…" : "";
  return `${label} — ${snippet}${ellipsis}`;
}
