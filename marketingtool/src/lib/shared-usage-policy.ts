import { z } from "zod";

import { calculateModelUsageCost } from "./pricing.ts";

export interface SharedUsageInput {
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

export interface SharedUsageIncrement extends SharedUsageInput {
  totalCost: number;
}

const sharedUsageInputSchema = z
  .object({
    userId: z.string().uuid(),
    model: z.string().min(1).max(100),
    promptTokens: z.number().int().nonnegative().max(100_000_000),
    completionTokens: z.number().int().nonnegative().max(100_000_000),
  })
  .strict();

export function prepareSharedUsageIncrement(
  input: SharedUsageInput,
): SharedUsageIncrement | null {
  const validated = sharedUsageInputSchema.parse(input);
  if (
    validated.promptTokens === 0 &&
    validated.completionTokens === 0
  ) {
    return null;
  }

  return {
    ...validated,
    totalCost: calculateModelUsageCost(
      validated.model,
      validated.promptTokens,
      validated.completionTokens,
    ),
  };
}
