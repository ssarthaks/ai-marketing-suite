import "server-only";

import type { ContentType, Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { visibilityWhereClause } from "@/lib/visibility";

export interface LibraryFilters {
  query?: string;
  type?: ContentType;
  campaignId?: string;
  favoritesOnly?: boolean;
  collection?: string;
  scope?: "mine" | "shared" | "public" | "private";
}

export async function listContent(
  workspaceId: string,
  filters: LibraryFilters = {},
  userId?: string
) {
  let scopeCondition: Prisma.ContentGenerationWhereInput = {};

  if (filters.scope === "mine" && userId) {
    scopeCondition = { createdById: userId };
  } else if (filters.scope === "shared" && userId) {
    scopeCondition = {
      createdById: { not: userId },
      sharedWithUserIds: { has: userId },
    };
  } else if (filters.scope === "public") {
    scopeCondition = { visibility: "PUBLIC" };
  } else if (filters.scope === "private" && userId) {
    scopeCondition = {
      AND: [
        { visibility: "PRIVATE" },
        visibilityWhereClause(userId),
      ],
    };
  } else if (filters.scope === "private") {
    scopeCondition = { id: "__no_authenticated_user__" };
  } else if (userId) {
    scopeCondition = {
      OR: [
        { visibility: "PUBLIC" },
        { createdById: userId },
        { sharedWithUserIds: { has: userId } },
      ],
    };
  }

  const where: Prisma.ContentGenerationWhereInput = {
    workspaceId,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
    ...(filters.favoritesOnly ? { isFavorite: true } : {}),
    ...(filters.collection ? { collection: filters.collection } : {}),
    AND: [
      scopeCondition,
      ...(filters.query
        ? [{
            OR: [
            { title: { contains: filters.query, mode: "insensitive" as const } },
            {
              content: {
                contains: filters.query,
                mode: "insensitive" as const,
              },
            },
            ],
          }]
        : []),
    ],
  };

  return db.contentGeneration.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      campaign: userId
        ? {
            where: visibilityWhereClause(userId),
            select: { id: true, title: true },
          }
        : false,
    },
  });
}

import { cache } from "react";

export const listCollections = cache(async (
  workspaceId: string,
  userId: string,
): Promise<string[]> => {
  const rows = await db.contentGeneration.findMany({
    where: {
      workspaceId,
      collection: { not: null },
      ...visibilityWhereClause(userId),
    },
    distinct: ["collection"],
    select: { collection: true },
    orderBy: { collection: "asc" },
  });
  return rows
    .map((row) => row.collection)
    .filter((collection): collection is string => collection !== null);
});

export async function getContentDetail(
  workspaceId: string,
  id: string,
  userId: string,
) {
  return db.contentGeneration.findFirst({
    where: { id, workspaceId, ...visibilityWhereClause(userId) },
    include: {
      campaign: {
        where: visibilityWhereClause(userId),
        select: { id: true, title: true },
      },
    },
  });
}
