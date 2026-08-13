import "server-only";

import { randomUUID } from "crypto";
import { compare } from "bcryptjs";
import type { User } from "@prisma/client";

import { db } from "@/server/db";
import { query } from "@/lib/db";
import { isAllowedIdentityRole } from "./credential-security";
import { getDevelopmentAuthBypassEmail } from "./dev-bypass-policy";

const DUMMY_PASSWORD_HASH =
  "$2b$12$clq7pW53G4DeVX2bESJwYupNwRSMcwqleE0gO70ZqbrgKH00P/AYO";

export interface SharedIdentity {
  id: string;
  email: string;
  role: string;
  passwordHash: string;
  forcePasswordChange: boolean;
  proModelAccess: boolean;
  proModelRequested: boolean;
}

export interface SyncedUser {
  user: User;
  identity: SharedIdentity;
}

interface SharedUserRow {
  id: string;
  email: string;
  role: string;
  password_hash: string;
  force_password_change: boolean;
  pro_model_access: boolean;
  pro_model_requested: boolean;
}

async function synchronizeSharedUser(
  sharedUser: SharedUserRow,
): Promise<SyncedUser> {
  let user = await db.user.findFirst({
    where: {
      email: { equals: sharedUser.email, mode: "insensitive" },
    },
  });
  if (user) {
    user = await db.user.update({
      where: { id: user.id },
      data: {
        email: sharedUser.email,
        passwordHash: sharedUser.password_hash,
      },
    });
  } else {
    user = await db.user.create({
      data: {
        email: sharedUser.email,
        name: nameFromEmail(sharedUser.email),
        passwordHash: sharedUser.password_hash,
        onboardedAt: new Date(),
      },
    });
  }

  await ensureProjectMemberships(user.id);
  return {
    user,
    identity: {
      id: sharedUser.id,
      email: sharedUser.email,
      role: sharedUser.role,
      passwordHash: sharedUser.password_hash,
      forcePasswordChange: Boolean(sharedUser.force_password_change),
      proModelAccess: Boolean(sharedUser.pro_model_access),
      proModelRequested: Boolean(sharedUser.pro_model_requested),
    },
  };
}

/**
 * Cross-database user synchronization between this app's Prisma database
 * (the `User` table) and the shared AiAgent database (the `users` table used by
 * the AI Agent). Both apps hash passwords with bcryptjs, so hashes are
 * portable between the two stores keyed by email.
 */

/** Turn "jane.doe@example.com" into "Jane Doe". */
export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "user";
  return (
    local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" ") || "User"
  );
}

/**
 * Ensure a newly provisioned account has a safe personal workspace.
 *
 * Project membership is an authorization decision and must be granted
 * explicitly; authenticating must never enroll a user into every tenant.
 */
export async function ensureProjectMemberships(userId: string): Promise<void> {
  const membership = await db.workspaceMember.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (membership) return;

  await db.workspace.create({
    data: {
      name: "Personal workspace",
      slug: `personal-${userId}`,
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
  });
}

/**
 * Best-effort mirror of a marketing-tool account into the AiAgent `users`
 * table so the AI Agent accepts the same credentials. Never throws.
 */
export async function ensureSharedUser(
  email: string,
  passwordHash: string,
): Promise<void> {
  try {
    await query(
      `INSERT INTO users (id, email, password_hash, role, force_password_change)
       VALUES ($1, $2, $3, 'user', FALSE)
       ON CONFLICT (email) DO NOTHING`,
      [randomUUID(), email, passwordHash],
    );
  } catch (error) {
    console.error("[user-sync] Failed to mirror user into AiAgent DB:", error);
  }
}

/**
 * Fallback login path: validate credentials against the AiAgent `users` table
 * and, when they check out, provision (or re-sync) the local Prisma user with
 * the same password hash and project memberships. Returns the local user on
 * success, null otherwise.
 */
export async function loginViaAiAgent(
  email: string,
  password: string,
): Promise<SyncedUser | null> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const res = await query(
      `SELECT id, email, password_hash, role, force_password_change,
              pro_model_access, pro_model_requested
       FROM users
       WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
      [normalizedEmail],
    );
    const sharedUser = res.rows[0] as SharedUserRow | undefined;
    const passwordHash = sharedUser?.password_hash || DUMMY_PASSWORD_HASH;
    const valid = await compare(password, passwordHash);
    if (
      !sharedUser?.password_hash ||
      !valid ||
      sharedUser.force_password_change ||
      !isAllowedIdentityRole(sharedUser.role)
    ) {
      return null;
    }

    return await synchronizeSharedUser(sharedUser);
  } catch (error) {
    console.error("[user-sync] AiAgent fallback login failed:", error);
    return null;
  }
}

/**
 * Establish a normal local mapping for one explicitly configured developer.
 * This skips password comparison only in an opted-in `next dev` process; the
 * shared identity, role, password state, credential version, and workspace
 * memberships remain authoritative for the resulting Auth.js session.
 */
export async function loginViaDevelopmentBypass(
  requestedEmail: string,
): Promise<SyncedUser | null> {
  const configuredEmail = getDevelopmentAuthBypassEmail();
  if (
    !configuredEmail ||
    requestedEmail.trim().toLowerCase() !== configuredEmail
  ) {
    return null;
  }

  try {
    const result = await query(
      `SELECT id, email, password_hash, role, force_password_change,
              pro_model_access, pro_model_requested
       FROM users
       WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL
       LIMIT 1`,
      [configuredEmail],
    );
    const sharedUser = result.rows[0] as SharedUserRow | undefined;
    if (
      !sharedUser?.password_hash ||
      sharedUser.force_password_change ||
      !isAllowedIdentityRole(sharedUser.role)
    ) {
      return null;
    }

    return await synchronizeSharedUser(sharedUser);
  } catch (error) {
    console.error(
      "[user-sync] Development auth bypass failed:",
      error instanceof Error ? error.name : "Unknown error",
    );
    return null;
  }
}
