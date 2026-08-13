// Token pricing per 1M tokens (input/output) in USD
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // DeepSeek
  "deepseek-v4-flash": { input: 0.14, output: 0.28 },
  "deepseek-v4-pro": { input: 0.435, output: 0.87 },
  "deepseek-chat": { input: 0.14, output: 0.28 },
  "deepseek-reasoner": { input: 0.55, output: 2.19 },

  // OpenAI
  "gpt-4o": { input: 2.50, output: 10.00 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 },

  // Claude / Anthropic
  "claude-3-5-sonnet": { input: 3.00, output: 15.00 },
  "claude-3-5-sonnet-20241022": { input: 3.00, output: 15.00 },
  "claude-3-5-haiku": { input: 0.80, output: 4.00 },
  "claude-3-5-haiku-20241022": { input: 0.80, output: 4.00 },

  // Gemini / Google
  "gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "gemini-1.5-flash": { input: 0.075, output: 0.30 },
  "gemini-2.5-pro": { input: 1.25, output: 5.00 },
};
