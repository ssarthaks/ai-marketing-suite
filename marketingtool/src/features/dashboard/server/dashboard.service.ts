import "server-only";

import { subDays } from "date-fns";

import { db } from "@/server/db";
import { buildDailySeries } from "@/lib/timeseries";
import { visibilityWhereClause } from "@/lib/visibility";

import { cache } from "react";

const TREND_DAYS = 30;

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export const getDashboardData = cache(async (
  workspaceId: string,
  userId: string,
) => {
  const since = subDays(new Date(), TREND_DAYS);
  const visible = visibilityWhereClause(userId);
  const visibleAssets = visibilityWhereClause(userId, "uploadedById");

  const [
    campaignCount,
    contentCount,
    assetCount,
    landingPageCount,
    leadCount,
    activities,
    recentGenerations,
    contentDates,
    leadDates,
  ] = await Promise.all([
    db.campaign.count({ where: { workspaceId, ...visible } }),
    db.contentGeneration.count({ where: { workspaceId, ...visible } }),
    db.asset.count({ where: { workspaceId, ...visibleAssets } }),
    db.landingPage.count({ where: { workspaceId, ...visible } }),
    db.lead.count({ where: { workspaceId } }),
    db.activity.findMany({
      where: { workspaceId, userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.contentGeneration.findMany({
      where: { workspaceId, ...visible },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        type: true,
        collection: true,
        tokensUsed: true,
        createdAt: true,
      },
    }),
    db.contentGeneration.findMany({
      where: { workspaceId, createdAt: { gte: since }, ...visible },
      select: { createdAt: true },
    }),
    db.lead.findMany({
      where: { workspaceId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  return {
    counts: {
      campaigns: campaignCount,
      content: contentCount,
      assets: assetCount,
      landingPages: landingPageCount,
      leads: leadCount,
    },
    activities,
    recentGenerations,
    contentSeries: buildDailySeries(
      contentDates.map((row) => row.createdAt),
      TREND_DAYS
    ),
    leadSeries: buildDailySeries(
      leadDates.map((row) => row.createdAt),
      TREND_DAYS
    ),
  };
});
