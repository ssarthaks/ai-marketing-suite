import assert from "node:assert/strict";
import test from "node:test";

import { calculateModelUsageCost } from "./pricing.ts";

test("calculates the same per-million DeepSeek costs as the AI Agent", () => {
  assert.ok(
    Math.abs(
      calculateModelUsageCost(
        "deepseek-v4-flash",
        1_000_000,
        1_000_000,
      ) - 0.42,
    ) < 1e-12,
  );
  assert.ok(
    Math.abs(
      calculateModelUsageCost(
        "deepseek-v4-pro",
        1_000_000,
        1_000_000,
      ) - 1.305,
    ) < 1e-12,
  );
});

test("prices input and output tokens independently", () => {
  const actual = calculateModelUsageCost(
    "deepseek-v4-flash",
    250_000,
    100_000,
  );
  assert.ok(Math.abs(actual - 0.063) < Number.EPSILON);
});

test("retains token accounting for configured zero-cost models", () => {
  assert.equal(calculateModelUsageCost("qwen-flash", 8_000, 2_000), 0);
});

test("fails closed for unknown pricing or invalid provider counts", () => {
  assert.throws(
    () => calculateModelUsageCost("unknown-model", 100, 50),
    /Missing pricing/,
  );
  assert.throws(
    () => calculateModelUsageCost("deepseek-v4-flash", -1, 50),
    /Invalid provider token usage/,
  );
  assert.throws(
    () => calculateModelUsageCost("deepseek-v4-flash", 1.5, 50),
    /Invalid provider token usage/,
  );
  assert.throws(
    () =>
      calculateModelUsageCost(
        "deepseek-v4-flash",
        100_000_001,
        50,
      ),
    /Invalid provider token usage/,
  );
});
