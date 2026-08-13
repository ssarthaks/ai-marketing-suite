import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { query } from "@/lib/db";
import type { WorkspaceRole } from "@prisma/client";
import {
  getCredentialVersion,
  isAllowedIdentityRole,
  safeCredentialVersionEqual,
} from "./credential-security";

/** Cookie holding the user's currently selected project workspace. */
export const ACTIVE_WORKSPACE_COOKIE = "mkos_active_ws";

export interface WorkspaceScope {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  /** Product key linking to .agents/<key>/ docs; null for personal workspaces. */
  productKey: string | null;
  name: string;
  email: string;
  role: WorkspaceRole;
}

/**
 * A per-request cache to store the active workspace ID resolved by the layout,
 * so child pages don't need to pass the parameter again.
 */
const getRequestContext = cache(() => ({ currentWorkspaceId: null as string | null }));

/**
 * Resolve the authenticated user + active workspace for the current request
 * without redirecting. The active workspace is the one selected via the
 * project-switcher cookie (validated against membership), falling back to the
 * default workspace cached in the JWT at sign-in. Cached per request.
 */
export const resolveWorkspace = cache(
  async (routeWorkspaceId?: string): Promise<WorkspaceScope | null> => {
    const session = await auth();
    const user = session?.user;
    if (!user?.id || !user.sharedIdentityId || !user.email) return null;

    // Access is owned by the shared AI Agent users table. A stale local
    // Prisma account/session must never grant access after that account is
    // removed or disabled in the AI Agent.
    const sharedUser = await query(
      `SELECT id, password_hash, role
       FROM users
       WHERE id = $1
         AND LOWER(email) = LOWER($2)
         AND deleted_at IS NULL
         AND force_password_change = FALSE`,
      [user.sharedIdentityId, user.email]
    );
    const identity = sharedUser.rows[0];
    if (
      !identity?.password_hash ||
      !isAllowedIdentityRole(identity.role) ||
      typeof user.credential_version !== "string" ||
      !safeCredentialVersionEqual(
        user.credential_version,
        getCredentialVersion(identity.password_hash),
      )
    ) {
      return null;
    }

    const reqContext = getRequestContext();
    if (routeWorkspaceId) {
      reqContext.currentWorkspaceId = routeWorkspaceId;
    }
    const effectiveWorkspaceId = routeWorkspaceId || reqContext.currentWorkspaceId;

    // If a route parameter (or previously set context) was provided, validate against it
    if (effectiveWorkspaceId) {
      const membership = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: effectiveWorkspaceId, userId: user.id } },
        select: {
          role: true,
          workspace: { select: { id: true, name: true, productKey: true } },
        },
      });
      if (membership) {
        return {
          userId: user.id,
          workspaceId: membership.workspace.id,
          workspaceName: membership.workspace.name,
          productKey: membership.workspace.productKey,
          name: user.name ?? "",
          email: user.email ?? "",
          role: membership.role,
        };
      }
      // If the route param was invalid or unauthorized, return null (triggers 404 or redirect)
      return null;
    }

    // Prefer the cookie-selected workspace when the user is a member of it.
    const cookieStore = await cookies();
    const requested = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

    if (requested && requested !== user.workspaceId) {
      const membership = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: requested, userId: user.id } },
        select: {
          role: true,
          workspace: { select: { id: true, name: true, productKey: true } },
        },
      });
      if (membership) {
        return {
          userId: user.id,
          workspaceId: membership.workspace.id,
          workspaceName: membership.workspace.name,
          productKey: membership.workspace.productKey,
          name: user.name ?? "",
          email: user.email ?? "",
          role: membership.role,
        };
      }
    }

    if (!user.workspaceId) return null;

    // The JWT's default workspace is only a hint. Membership may have been
    // revoked after the token was issued, so validate it on every request.
    const membership = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: user.workspaceId,
          userId: user.id,
        },
      },
      select: {
        role: true,
        workspace: { select: { id: true, name: true, productKey: true } },
      },
    });
    if (!membership) return null;

    return {
      userId: user.id,
      workspaceId: membership.workspace.id,
      workspaceName: membership.workspace.name,
      productKey: membership.workspace.productKey,
      name: user.name ?? "",
      email: user.email ?? "",
      role: membership.role,
    };
  }
);

/**
 * Resolve the authenticated user + active workspace for the current request.
 * Redirects to /login when unauthenticated. Cached per request.
 */
export const requireWorkspace = cache(async (workspaceId?: string): Promise<WorkspaceScope> => {
  const scope = await resolveWorkspace(workspaceId);
  if (!scope) redirect("/login");
  return scope;
});

export interface WorkspaceListItem {
  id: string;
  name: string;
  slug: string;
  productKey: string | null;
}

/**
 * All workspaces the user belongs to, project workspaces first
 * (alphabetical), then personal workspaces.
 */
export const listUserWorkspaces = cache(
  async (userId: string): Promise<WorkspaceListItem[]> => {
    const session = await auth();
    if (session?.user?.id !== userId) return [];

    const memberships = await db.workspaceMember.findMany({
      where: { userId },
      select: {
        workspace: {
          select: { id: true, name: true, slug: true, productKey: true },
        },
      },
    });
    return memberships
      .map((m) => m.workspace)
      .sort((a, b) => {
        if (Boolean(a.productKey) !== Boolean(b.productKey)) {
          return a.productKey ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }
);
