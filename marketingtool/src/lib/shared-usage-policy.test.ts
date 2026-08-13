import assert from "node:assert/strict";
import test from "node:test";

import { prepareSharedUsageIncrement } from "./shared-usage-policy.ts";

const SHARED_USER_ID = "6d6dc989-d42a-4dc4-baa5-2f23138cc18f";

test("targets the shared AiAgent UUID and calculates its atomic increment", () => {
  const increment = prepareSharedUsageIncrement({
    userId: SHARED_USER_ID,
    model: "deepseek-v4-flash",
    promptTokens: 250_000,
    completionTokens: 100_000,
  });

  assert.equal(increment?.userId, SHARED_USER_ID);
  assert.equal(increment?.promptTokens, 250_000);
  assert.equal(increment?.completionTokens, 100_000);
  assert.ok(
    increment !== null &&
      Math.abs(increment.totalCost - 0.063) < Number.EPSILON,
  );
});

test("does not write an empty provider usage report", () => {
  assert.equal(
    prepareSharedUsageIncrement({
      userId: SHARED_USER_ID,
      model: "deepseek-v4-flash",
      promptTokens: 0,
      completionTokens: 0,
    }),
    null,
  );
});

test("rejects a local Prisma CUID and invalid token counts", () => {
  assert.throws(() =>
    prepareSharedUsageIncrement({
      userId: "cmrq49bff000n3tea9iin67dr",
      model: "deepseek-v4-flash",
      promptTokens: 100,
      completionTokens: 50,
    }),
  );
  assert.throws(() =>
    prepareSharedUsageIncrement({
      userId: SHARED_USER_ID,
      model: "deepseek-v4-flash",
      promptTokens: 100,
      completionTokens: -1,
    }),
  );
});
