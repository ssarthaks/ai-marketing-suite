import "server-only";

import type { ActivityAction, EntityType, Prisma } from "@prisma/client";

import { db } from "@/server/db";

interface LogActivityInput {
  workspaceId: string;
  userId?: string;
  action: ActivityAction;
  entityType: EntityType;
  entityId?: string;
  title: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Append an entry to the workspace activity feed.
 * Never throws — activity logging must not break the primary operation.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await db.activity.create({
      data: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        title: input.title,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("[activity] failed to log activity", error);
  }
}
