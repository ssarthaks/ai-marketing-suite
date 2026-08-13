// Token pricing per 1M tokens (input/output) in USD
export const MODEL_PRICING: Record<string, { input: number; output: number }> =
  {
    "deepseek-v4-flash": { input: 0.14, output: 0.28 },
    "deepseek-v4-pro": { input: 0.435, output: 0.87 },
  };
