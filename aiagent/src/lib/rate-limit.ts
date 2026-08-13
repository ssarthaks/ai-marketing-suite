import crypto from "node:crypto";

type RateLimitRecord = { count: number; expiresAt: number };
const MAX_BUCKETS = 10_000;

const globalForRateLimit = globalThis as typeof globalThis & {
  __aiagentRateLimitMap?: Map<string, RateLimitRecord>;
};

const rateLimitMap =
  globalForRateLimit.__aiagentRateLimitMap ??
  (globalForRateLimit.__aiagentRateLimitMap = new Map());

function getStorageKey(identifier: string): string {
  return crypto
    .createHash("sha256")
    .update(identifier.slice(0, 512), "utf8")
    .digest("base64url");
}

export async function rateLimit(
  identifier: string,
  limit = 5,
  windowMs = 60000,
) {
  const now = Date.now();
  const storageKey = getStorageKey(identifier);
  const record = rateLimitMap.get(storageKey);

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
    rateLimitMap.set(storageKey, { count: 1, expiresAt: now + windowMs });
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

export function clearRateLimit(identifier: string): void {
  rateLimitMap.delete(getStorageKey(identifier));
}
