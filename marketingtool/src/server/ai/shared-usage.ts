import "server-only";

import { query } from "@/lib/db";
import {
  prepareSharedUsageIncrement,
  type SharedUsageInput,
} from "@/lib/shared-usage-policy";

export type { SharedUsageInput } from "@/lib/shared-usage-policy";

/**
 * Atomically add Marketing Tool usage to the AI Agent's authoritative users
 * ledger. `userId` is the shared AiAgent UUID, never the local Prisma user CUID.
 */
export async function recordSharedUsage(
  input: SharedUsageInput,
): Promise<void> {
  const increment = prepareSharedUsageIncrement(input);
  if (!increment) return;
  const { userId, promptTokens, completionTokens, totalCost } = increment;
  const result = await query(
    `UPDATE users
     SET total_input_tokens = COALESCE(total_input_tokens, 0) + $1,
         total_output_tokens = COALESCE(total_output_tokens, 0) + $2,
         total_cost = COALESCE(total_cost, 0) + $3
     WHERE id = $4 AND deleted_at IS NULL`,
    [promptTokens, completionTokens, totalCost, userId],
  );
  if (result.rowCount !== 1) {
    throw new Error("Shared AI usage user was not found");
  }
}

/**
 * Usage persistence must not hide a successfully generated answer. There is
 * intentionally no automatic retry: an increment is atomic but not
 * idempotent, so retrying an ambiguous database failure could double-count.
 */
export async function recordSharedUsageBestEffort(
  input: SharedUsageInput,
): Promise<void> {
  try {
    await recordSharedUsage(input);
  } catch (error) {
    console.error(
      "[ai-usage] Failed to update the shared usage ledger:",
      error instanceof Error ? error.name : "Unknown error",
    );
  }
}
