import "server-only";

import { db } from "@/server/db";
import { getGenerationDisplayLabel } from "@/lib/content-display";
import type { SearchResult } from "@/features/search/types";
import { visibilityWhereClause } from "@/lib/visibility";

const PER_GROUP = 5;

export async function searchWorkspace(
  workspaceId: string,
  userId: string,
  query: string
): Promise<SearchResult[]> {
  const contains = { contains: query, mode: "insensitive" as const };

  const [campaigns, content, assets, landingPages, leadMagnets] =
    await Promise.all([
      db.campaign.findMany({
        where: {
          workspaceId,
          title: contains,
          ...visibilityWhereClause(userId),
        },
        take: PER_GROUP,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, status: true },
      }),
      db.contentGeneration.findMany({
        where: {
          workspaceId,
          AND: [
            visibilityWhereClause(userId),
            { OR: [{ title: contains }, { content: contains }] },
          ],
        },
        take: PER_GROUP,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, type: true, collection: true },
      }),
      db.asset.findMany({
        where: {
          workspaceId,
          name: contains,
          ...visibilityWhereClause(userId, "uploadedById"),
        },
        take: PER_GROUP,
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, folder: true },
      }),
      db.landingPage.findMany({
        where: {
          workspaceId,
          title: contains,
          ...visibilityWhereClause(userId),
        },
        take: PER_GROUP,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, slug: true },
      }),
      db.leadMagnet.findMany({
        where: {
          workspaceId,
          title: contains,
          ...visibilityWhereClause(userId),
        },
        take: PER_GROUP,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, type: true },
      }),
    ]);

  return [
    ...campaigns.map(
      (campaign): SearchResult => ({
        id: campaign.id,
        group: "campaign",
        title: campaign.title,
        subtitle: campaign.status.toLowerCase(),
        href: `/campaigns/${campaign.id}`,
      })
    ),
    ...content.map(
      (item): SearchResult => ({
        id: item.id,
        group: "content",
        title: item.title,
        subtitle: getGenerationDisplayLabel(item),
        href: `/library/${item.id}`,
      })
    ),
    ...assets.map(
      (asset): SearchResult => ({
        id: asset.id,
        group: "asset",
        title: asset.name,
        subtitle: asset.folder,
        href: "/assets",
      })
    ),
    ...landingPages.map(
      (page): SearchResult => ({
        id: page.id,
        group: "landing-page",
        title: page.title,
        subtitle: `/p/${page.slug}`,
        href: `/landing-pages/${page.id}`,
      })
    ),
    ...leadMagnets.map(
      (magnet): SearchResult => ({
        id: magnet.id,
        group: "lead-magnet",
        title: magnet.title,
        href: `/lead-magnets/${magnet.id}`,
      })
    ),
  ];
}
