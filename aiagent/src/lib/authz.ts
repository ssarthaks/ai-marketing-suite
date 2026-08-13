import { auth } from "@/auth";
import { query } from "@/lib/db";
import { getCredentialVersion, safeSecretEqual } from "@/lib/server-security";
import { USER_ROLES, type UserRole } from "@/lib/validation";

export type ActiveUser = {
  id: string;
  email: string;
  role: UserRole;
  forcePasswordChange: boolean;
  proModelAccess: boolean;
  proModelRequested: boolean;
};

/**
 * Re-check the database on every protected server boundary. JWT claims are
 * useful for rendering, but must not remain authoritative after an account is
 * deleted, a role is changed, or Pro access is revoked.
 */
export async function requireActiveUser(options?: {
  allowPasswordSetup?: boolean;
}): Promise<ActiveUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const result = await query(
    `SELECT id, email, password_hash, role, force_password_change, pro_model_access, pro_model_requested
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [session.user.id],
  );
  const row = result.rows[0];

  if (
    !row ||
    !USER_ROLES.includes(row.role) ||
    typeof session.user.credential_version !== "string"
  ) {
    throw new Error("Unauthorized");
  }

  const currentCredentialVersion = getCredentialVersion(row.password_hash);
  if (
    !safeSecretEqual(session.user.credential_version, currentCredentialVersion)
  ) {
    throw new Error("Unauthorized");
  }

  if (row.force_password_change && !options?.allowPasswordSetup) {
    throw new Error("Password setup required");
  }

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    forcePasswordChange: !!row.force_password_change,
    proModelAccess: !!row.pro_model_access,
    proModelRequested: !!row.pro_model_requested,
  };
}

export async function requireRole(
  allowedRoles: readonly UserRole[],
): Promise<ActiveUser> {
  const user = await requireActiveUser();
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}
