"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { ACTIVE_WORKSPACE_COOKIE, resolveWorkspace } from "@/server/auth/session";
import { fail, ok, type ActionResult } from "@/lib/action-result";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Switch the active project workspace for the current user.
 * Validates membership before persisting the selection in a cookie.
 */
export async function switchWorkspaceAction(
  workspaceId: string
): Promise<ActionResult<void>> {
  if (typeof workspaceId !== "string" || workspaceId.length > 128) {
    return fail("Invalid project");
  }
  const scope = await resolveWorkspace(workspaceId);
  if (!scope) return fail("You are not a member of this project");

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });

  revalidatePath("/", "layout");
  return ok(undefined);
}
