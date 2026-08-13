import "server-only";

import type { AssetType, Prisma } from "@prisma/client";

import { db } from "@/server/db";
import type { AssetDTO } from "@/features/assets/types";
import { visibilityWhereClause } from "@/lib/visibility";

export interface AssetFilters {
  query?: string;
  folder?: string;
  type?: AssetType;
}

export async function listAssets(
  workspaceId: string,
  filters: AssetFilters = {},
  userId?: string
): Promise<AssetDTO[]> {
  const where: Prisma.AssetWhereInput = {
    workspaceId,
    ...(filters.folder ? { folder: filters.folder } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.query
      ? { name: { contains: filters.query, mode: "insensitive" as const } }
      : {}),
    ...(userId
      ? {
          OR: [
            { visibility: "PUBLIC" },
            { uploadedById: userId },
            { sharedWithUserIds: { has: userId } },
          ],
        }
      : {}),
  };

  const assets = await db.asset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      folder: true,
      type: true,
      mimeType: true,
      size: true,
      url: true,
      publicId: true,
      width: true,
      height: true,
      format: true,
      campaignId: true,
      visibility: true,
      sharedWithUserIds: true,
      uploadedBy: { select: { id: true, name: true, email: true } },
      createdAt: true,
    },
  });

  return assets.map((asset) => ({
    ...asset,
    createdAt: asset.createdAt.toISOString(),
  }));
}

export async function listAssetFolders(
  workspaceId: string,
  userId: string,
): Promise<string[]> {
  const rows = await db.asset.findMany({
    where: {
      workspaceId,
      ...visibilityWhereClause(userId, "uploadedById"),
    },
    distinct: ["folder"],
    select: { folder: true },
    orderBy: { folder: "asc" },
  });
  const folders = rows.map((row) => row.folder);
  return folders.includes("/") ? folders : ["/", ...folders];
}
