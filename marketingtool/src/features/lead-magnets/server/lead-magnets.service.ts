import "server-only";

import { db } from "@/server/db";
import { magnetContentSchema } from "@/features/lead-magnets/schemas/lead-magnet.schema";
import { visibilityWhereClause } from "@/lib/visibility";

export async function listLeadMagnets(workspaceId: string, userId?: string) {
  return db.leadMagnet.findMany({
    where: {
      workspaceId,
      ...(userId
        ? {
            OR: [
              { visibility: "PUBLIC" },
              { createdById: userId },
              { sharedWithUserIds: { has: userId } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      campaign: { select: { id: true, title: true } },
      _count: { select: { leads: true } },
    },
  });
}

export type LeadMagnetEditorData = NonNullable<
  Awaited<ReturnType<typeof getLeadMagnetForEditor>>
>;

export async function getLeadMagnetForEditor(
  workspaceId: string,
  id: string,
  userId: string,
) {
  const magnet = await db.leadMagnet.findFirst({
    where: { id, workspaceId, ...visibilityWhereClause(userId) },
    include: {
      asset: { select: { id: true, name: true, url: true } },
      campaign: {
        where: visibilityWhereClause(userId),
        select: { id: true, title: true },
      },
      _count: { select: { leads: true } },
    },
  });
  if (!magnet) return null;

  const content = magnetContentSchema.safeParse(magnet.content);
  return {
    id: magnet.id,
    title: magnet.title,
    slug: magnet.slug,
    type: magnet.type,
    description: magnet.description,
    body: content.success ? content.data.body : "",
    status: magnet.status,
    assetId: magnet.assetId,
    asset: magnet.asset,
    campaignId: magnet.campaignId,
    campaign: magnet.campaign,
    leadCount: magnet._count.leads,
  };
}

export async function getPublishedLeadMagnet(slug: string) {
  return db.leadMagnet.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      type: true,
      description: true,
    },
  });
}
