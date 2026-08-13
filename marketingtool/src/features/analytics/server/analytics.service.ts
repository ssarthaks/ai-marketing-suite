import "server-only";

import { subDays } from "date-fns";

import { db } from "@/server/db";
import { buildDailySeries } from "@/lib/timeseries";
import {
  getGenerationDisplayKey,
  getGenerationDisplayLabel,
} from "@/lib/content-display";
import { visibilityWhereClause } from "@/lib/visibility";

const TREND_DAYS = 30;

export type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsData>>;

export async function getAnalyticsData(workspaceId: string, userId: string) {
  const since = subDays(new Date(), TREND_DAYS);
  const visible = visibilityWhereClause(userId);

  const [
    contentByType,
    leadsBySource,
    landingPages,
    tokenAggregate,
    leadDates,
    contentDates,
  ] = await Promise.all([
    db.contentGeneration.groupBy({
      by: ["type", "collection"],
      where: { workspaceId, ...visible },
      _count: { _all: true },
      orderBy: { _count: { type: "desc" } },
    }),
    db.lead.groupBy({
      by: ["source"],
      where: { workspaceId },
      _count: { _all: true },
      orderBy: { _count: { source: "desc" } },
    }),
    db.landingPage.findMany({
      where: { workspaceId, ...visible },
      orderBy: { views: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        views: true,
        _count: { select: { leads: true } },
      },
    }),
    db.contentGeneration.aggregate({
      where: { workspaceId, ...visible },
      _sum: { tokensUsed: true },
      _count: { _all: true },
    }),
    db.lead.findMany({
      where: { workspaceId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    db.contentGeneration.findMany({
      where: { workspaceId, createdAt: { gte: since }, ...visible },
      select: { createdAt: true },
    }),
  ]);

  const contentByDisplayType = new Map<
    string,
    { type: string; label: string; count: number }
  >();
  for (const row of contentByType) {
    const key = getGenerationDisplayKey(row);
    const existing = contentByDisplayType.get(key);
    if (existing) {
      existing.count += row._count._all;
      continue;
    }
    contentByDisplayType.set(key, {
      type: key,
      label: getGenerationDisplayLabel(row),
      count: row._count._all,
    });
  }

  return {
    contentByType: [...contentByDisplayType.values()].sort(
      (a, b) => b.count - a.count,
    ),
    leadsBySource: leadsBySource.map((row) => ({
      source: row.source,
      count: row._count._all,
    })),
    landingPages,
    totals: {
      tokensUsed: tokenAggregate._sum.tokensUsed ?? 0,
      generations: tokenAggregate._count._all,
    },
    leadSeries: buildDailySeries(
      leadDates.map((row) => row.createdAt),
      TREND_DAYS
    ),
    contentSeries: buildDailySeries(
      contentDates.map((row) => row.createdAt),
      TREND_DAYS
    ),
  };
}
