import "server-only";

import type { CampaignStatus, Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { visibilityWhereClause } from "@/lib/visibility";

export type CampaignListItem = Awaited<
  ReturnType<typeof listCampaigns>
>[number];

export async function listCampaigns(
  workspaceId: string,
  filter?: { status?: CampaignStatus; query?: string },
  userId?: string
) {
  const where: Prisma.CampaignWhereInput = {
    workspaceId,
    ...(filter?.status ? { status: filter.status } : {}),
    ...(filter?.query
      ? {
          title: { contains: filter.query, mode: "insensitive" as const },
        }
      : {}),
    ...(userId
      ? {
          OR: [
            { visibility: "PUBLIC" },
            { createdById: userId },
            { sharedWithUserIds: { has: userId } },
          ],
        }
      : {}),
  };

  const campaigns = await db.campaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: {
        select: {
          contentGenerations: true,
          assets: true,
          landingPages: true,
        },
      },
    },
  });

  return campaigns.map((campaign) => ({
    ...campaign,
    budget: campaign.budget === null ? null : Number(campaign.budget),
  }));
}

export type CampaignDetail = NonNullable<
  Awaited<ReturnType<typeof getCampaignDetail>>
>;

export async function getCampaignDetail(
  workspaceId: string,
  id: string,
  userId: string,
) {
  const visible = visibilityWhereClause(userId);
  const campaign = await db.campaign.findFirst({
    where: { id, workspaceId, ...visible },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: {
        select: {
          contentGenerations: { where: visible },
          assets: {
            where: visibilityWhereClause(userId, "uploadedById"),
          },
          landingPages: { where: visible },
          leadMagnets: { where: visible },
        },
      },
      contentGenerations: {
        where: visible,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          type: true,
          isFavorite: true,
          createdAt: true,
        },
      },
      assets: {
        where: visibilityWhereClause(userId, "uploadedById"),
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          name: true,
          type: true,
          url: true,
          format: true,
          size: true,
          createdAt: true,
        },
      },
      landingPages: {
        where: visible,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          views: true,
          createdAt: true,
        },
      },
    },
  });

  if (!campaign) return null;

  return {
    ...campaign,
    budget: campaign.budget === null ? null : Number(campaign.budget),
  };
}

export async function getCampaignActivities(
  workspaceId: string,
  id: string,
  userId: string,
) {
  return db.activity.findMany({
    where: {
      workspaceId,
      userId,
      OR: [
        { entityType: "CAMPAIGN", entityId: id },
        { metadata: { path: ["campaignId"], equals: id } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
}

import { cache } from "react";

/** Lightweight list used by pickers (AI Studio, uploads, builders). */
export const listCampaignOptions = cache(async (
  workspaceId: string,
  userId: string,
) => {
  return db.campaign.findMany({
    where: {
      workspaceId,
      status: { notIn: ["ARCHIVED"] },
      ...visibilityWhereClause(userId),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true },
  });
});
