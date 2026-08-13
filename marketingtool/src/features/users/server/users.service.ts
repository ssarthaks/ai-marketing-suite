import "server-only";

import { cache } from "react";
import { db } from "@/server/db";
import { nameFromEmail } from "@/server/auth/user-sync";

export interface UserOption {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

/**
 * Lists all existing platform users available for resource sharing.
 * Synchronizes with the shared AiAgent database so user lists are identical across both platforms.
 */
export const listUsersForSharing = cache(
  async (
    currentUserId?: string,
    workspaceId?: string,
    includeSelf = false,
  ): Promise<UserOption[]> => {
    let users: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    }[] = [];

    if (workspaceId) {
      const members = await db.workspaceMember.findMany({
        where: {
          workspaceId,
          ...(currentUserId && !includeSelf
            ? { userId: { not: currentUserId } }
            : {}),
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { user: { name: "asc" } },
      });
      users = members.map((m) => m.user);
    } else {
      users = await db.user.findMany({
        where: {
          AND: [
            currentUserId && !includeSelf ? { id: { not: currentUserId } } : {},
            { email: { not: { endsWith: "@company.com" } } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
        orderBy: { name: "asc" },
      });
    }

    const seen = new Set<string>();
    const uniqueUsers: UserOption[] = [];

    for (const u of users) {
      if (!u) continue;
      const key = u.email.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueUsers.push({
          id: u.id,
          name: u.name || nameFromEmail(u.email),
          email: u.email,
          image: u.image,
        });
      }
    }

    return uniqueUsers;
  },
);
