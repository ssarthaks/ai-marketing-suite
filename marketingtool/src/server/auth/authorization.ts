import "server-only";

import { auth } from "@/server/auth";
import { query } from "@/lib/db";
import {
  getCredentialVersion,
  isAllowedIdentityRole,
  safeCredentialVersionEqual,
} from "./credential-security";

export interface ActiveIdentity {
  id: string;
  email: string;
  role: string;
  forcePasswordChange: boolean;
  proModelAccess: boolean;
  proModelRequested: boolean;
}

/**
 * Resolve the current session against the shared identity database.
 *
 * JWTs are only a cache. Security-sensitive actions must re-check the source
 * of truth so deleted users and revoked roles lose access immediately.
 */
export async function requireActiveIdentity(
  options: { allowPasswordSetup?: boolean } = {},
): Promise<ActiveIdentity> {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  const sharedIdentityId = session?.user?.sharedIdentityId;
  if (!email || !sharedIdentityId) {
    throw new Error("Unauthorized");
  }

  const result = await query(
    `SELECT id, email, password_hash, role, force_password_change,
            pro_model_access, pro_model_requested
     FROM users
     WHERE id = $1
       AND LOWER(email) = LOWER($2)
       AND deleted_at IS NULL
     LIMIT 1`,
    [sharedIdentityId, email],
  );
  const user = result.rows[0];
  if (
    !user ||
    !user.password_hash ||
    !isAllowedIdentityRole(user.role) ||
    typeof session?.user?.credential_version !== "string"
  ) {
    throw new Error("Unauthorized");
  }
  const currentCredentialVersion = getCredentialVersion(user.password_hash);
  if (
    !safeCredentialVersionEqual(
      session.user.credential_version,
      currentCredentialVersion,
    )
  ) {
    throw new Error("Unauthorized");
  }
  if (user.force_password_change && !options.allowPasswordSetup) {
    throw new Error("Password setup required");
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    forcePasswordChange: Boolean(user.force_password_change),
    proModelAccess: Boolean(user.pro_model_access),
    proModelRequested: Boolean(user.pro_model_requested),
  };
}

export async function requireAdminIdentity(): Promise<ActiveIdentity> {
  const identity = await requireActiveIdentity();
  if (identity.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return identity;
}
