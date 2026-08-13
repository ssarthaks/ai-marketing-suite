import "server-only";

import { cache } from "react";

import { requireActiveIdentity } from "@/server/auth/authorization";

/**
 * Resolve the current user's id in the shared AiAgent `users` table (uuid).
 * Chat threads/messages live in the AiAgent database keyed by that id, so using
 * it here means one shared chat history across both apps. The shared identity
 * is authoritative: deleted or missing users must not be silently reprovisioned
 * from a stale local account. Cached per request.
 */
export const getSharedUserId = cache(async (): Promise<string | null> => {
  try {
    return (await requireActiveIdentity()).id;
  } catch {
    return null;
  }
});
