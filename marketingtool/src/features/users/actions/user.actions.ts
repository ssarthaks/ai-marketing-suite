"use server";

import { z } from "zod";

import { db } from "@/server/db";
import { requireWorkspace } from "@/server/auth/session";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import type { UserOption } from "@/features/users/server/users.service";
import { query } from "@/lib/db";
import { nameFromEmail } from "@/server/auth/user-sync";
import { emailAddressSchema } from "@/lib/password-security";
import { rateLimit } from "@/lib/rate-limit";
import { opaqueRateLimitKey } from "@/lib/request-security";

export async function addQuickTeamMemberAction(
  email: string,
  name?: string
): Promise<ActionResult<UserOption>> {
  const { userId, workspaceId, role } = await requireWorkspace();
  if (role !== "OWNER" && role !== "ADMIN") {
    return fail("Only workspace managers can add team members");
  }

  const parsedEmail = emailAddressSchema.safeParse(email);
  const parsedName = z.string().trim().min(1).max(120).optional().safeParse(name);
  if (!parsedEmail.success || !parsedName.success) {
    return fail("Please enter a valid email address");
  }
  const cleanEmail = parsedEmail.data;
  const limit = await rateLimit(
    opaqueRateLimitKey("workspace-member-add", userId),
    20,
    60 * 60_000,
  );
  if (!limit.success) return fail("Too many invitations. Try again later.");

  const sharedResult = await query(
    `SELECT email, password_hash
     FROM users
     WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
    [cleanEmail]
  );
  const sharedUser = sharedResult.rows[0];
  if (!sharedUser) {
    return fail(
      "This person does not have an active AI Agent account. Ask an administrator to create it there first."
    );
  }

  const cleanName = parsedName.data || nameFromEmail(sharedUser.email);

  let user = await db.user.findFirst({
    where: {
      email: { equals: cleanEmail, mode: "insensitive" },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      passwordHash: true,
    },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        name: cleanName,
        email: sharedUser.email,
        passwordHash: sharedUser.password_hash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        passwordHash: true,
      },
    });
  } else if (user.passwordHash !== sharedUser.password_hash) {
    user = await db.user.update({
      where: { id: user.id },
      data: { passwordHash: sharedUser.password_hash },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        passwordHash: true,
      },
    });
  }

  if (user.id === userId) {
    return fail("You cannot share a resource with yourself as you are already the owner");
  }

  await db.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    create: { workspaceId, userId: user.id, role: "MEMBER" },
    update: {},
  });

  return ok({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
  });
}
