import "server-only";

import crypto from "node:crypto";

const ALLOWED_IDENTITY_ROLES = new Set(["user", "team_lead", "admin"]);

/**
 * Bind a session to the exact password credential that established it.
 *
 * The password hash is never placed in the JWT. A keyed digest lets protected
 * server boundaries revoke every existing session as soon as the shared
 * password hash changes.
 */
export function getCredentialVersion(passwordHash: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Authentication secret is not securely configured");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(passwordHash, "utf8")
    .digest("base64url");
}

export function safeCredentialVersionEqual(
  provided: string,
  expected: string,
): boolean {
  const providedBuffer = Buffer.from(provided, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return (
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export function isAllowedIdentityRole(value: unknown): value is string {
  return typeof value === "string" && ALLOWED_IDENTITY_ROLES.has(value);
}
