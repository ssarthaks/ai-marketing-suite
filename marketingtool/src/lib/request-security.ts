import "server-only";

import { createHash } from "crypto";
import { headers } from "next/headers";

const MAX_IDENTIFIER_LENGTH = 512;

export function opaqueRateLimitKey(...parts: Array<string | null | undefined>) {
  const value = parts
    .map((part) => (part ?? "").slice(0, MAX_IDENTIFIER_LENGTH))
    .join("\u0000");
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Use the first proxy-provided address. Hosting platforms overwrite this
 * header; trimming prevents attackers from creating unbounded limiter keys.
 */
export async function clientAddress(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  const address = forwarded?.split(",")[0]?.trim();
  return (address || headerStore.get("x-real-ip") || "unknown").slice(0, 128);
}
