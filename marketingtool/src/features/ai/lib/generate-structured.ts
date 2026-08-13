import "server-only";

import type { z } from "zod";

import {
  chatCompletion,
  type ChatCompletionOptions,
  type ChatMessage,
} from "@/server/ai/client";
import {
  parseAiRoleOutput,
  StrictAiOutputError,
  type AiRoleKind,
} from "@/features/ai/lib";

export interface StructuredGenerationResult<T> {
  data: T;
  model: string;
  tokensUsed: number | null;
}

interface GenerateStructuredRoleOptions {
  messages: ChatMessage[];
  completion?: ChatCompletionOptions;
  repairInstruction: string;
}

/**
 * Generate and validate a role-owned JSON object. A malformed provider response
 * gets one tightly scoped repair attempt; valid responses never pay that cost.
 */
export async function generateStructuredRole<T>(
  kind: AiRoleKind,
  schema: z.ZodType<T>,
  options: GenerateStructuredRoleOptions,
): Promise<StructuredGenerationResult<T>> {
  const first = await chatCompletion(options.messages, options.completion);

  try {
    return {
      data: parseAiRoleOutput(kind, first.content, schema),
      model: first.model,
      tokensUsed: first.tokensUsed,
    };
  } catch (error) {
    if (!(error instanceof StrictAiOutputError)) throw error;

    const repaired = await chatCompletion(
      [
        {
          role: "system",
          content:
            "You repair JSON. Return exactly one valid JSON object with no Markdown fence, preamble, commentary, or extra keys.",
        },
        {
          role: "user",
          content: `${options.repairInstruction}

Validation problem: ${error.message}

Malformed response:
${first.content}`,
        },
      ],
      {
        temperature: 0,
        maxTokens: options.completion?.maxTokens,
      },
    );

    const data = parseAiRoleOutput(kind, repaired.content, schema);
    return {
      data,
      model: repaired.model,
      tokensUsed:
        first.tokensUsed === null || repaired.tokensUsed === null
          ? null
          : first.tokensUsed + repaired.tokensUsed,
    };
  }
}
