import "server-only";

import { createHash } from "crypto";

const MAX_BUCKETS = 10_000;
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function bucketKey(identifier: string): string {
  return createHash("sha256").update(identifier.slice(0, 1_024)).digest("hex");
}

export async function rateLimit(
  identifier: string,
  limit = 5,
  windowMs = 60000,
) {
  const now = Date.now();
  const key = bucketKey(identifier);
  const record = rateLimitMap.get(key);

  // Simple garbage collection to prevent memory leaks over time
  if (Math.random() < 0.05) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.expiresAt < now) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!record || record.expiresAt < now) {
    if (rateLimitMap.size >= MAX_BUCKETS) {
      const oldestKey = rateLimitMap.keys().next().value;
      if (oldestKey) rateLimitMap.delete(oldestKey);
    }
    rateLimitMap.set(key, { count: 1, expiresAt: now + windowMs });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowMs,
    };
  }

  if (record.count >= limit) {
    return { success: false, limit, remaining: 0, reset: record.expiresAt };
  }

  record.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: record.expiresAt,
  };
}
