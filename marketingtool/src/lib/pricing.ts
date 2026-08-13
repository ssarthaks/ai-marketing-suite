// Token pricing per 1M tokens (input/output) in USD
export const MODEL_PRICING: Record<string, { input: number; output: number }> =
  {
    "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
    "gemini-2.5-flash": { input: 0.15, output: 0.6 },
    "deepseek-v4-flash": { input: 0.14, output: 0.28 },
    "deepseek-v4-pro": { input: 0.435, output: 0.87 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "qwen-flash": { input: 0.0, output: 0.0 },
  };

const MAX_PROVIDER_TOKEN_COUNT = 100_000_000;

export function calculateModelUsageCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  if (
    !Number.isSafeInteger(promptTokens) ||
    promptTokens < 0 ||
    promptTokens > MAX_PROVIDER_TOKEN_COUNT ||
    !Number.isSafeInteger(completionTokens) ||
    completionTokens < 0 ||
    completionTokens > MAX_PROVIDER_TOKEN_COUNT
  ) {
    throw new Error("Invalid provider token usage");
  }

  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    throw new Error(`Missing pricing for AI model: ${model}`);
  }

  return (
    (promptTokens / 1_000_000) * pricing.input +
    (completionTokens / 1_000_000) * pricing.output
  );
}
