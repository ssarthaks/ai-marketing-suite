import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Coins, FileText, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireWorkspace } from "@/server/auth/session";
import { ContentByTypeChart } from "@/features/analytics/components/content-by-type-chart";
import { getAnalyticsData } from "@/features/analytics/server/analytics.service";
import { TrendChart } from "@/features/dashboard/components/trend-chart";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Analytics | Marketing OS - Conversion Tracking & Growth Metrics",
  description:
    "Analyze content generation trends, token usage, page views, lead capture channels, and conversion leaderboards.",
};

const SOURCE_LABELS: Record<string, string> = {
  "lead-magnet": "Lead magnets",
  "landing-page": "Landing pages",
  direct: "Direct",
};

export default async function AnalyticsPage() {
  const { userId, workspaceId } = await requireWorkspace();
  const data = await getAnalyticsData(workspaceId, userId);

  const hasAnyData =
    data.totals.generations > 0 ||
    data.landingPages.length > 0 ||
    data.leadsBySource.length > 0;

  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analytics"
          description="Performance across content, pages, and lead capture."
        />
        <EmptyState
          icon={BarChart3}
          title="No data to analyze yet"
          description="Generate content, publish a landing page, or capture a lead — analytics light up as your workspace fills."
        />
      </div>
    );
  }

  const maxSourceCount = Math.max(
    1,
    ...data.leadsBySource.map((row) => row.count)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Performance across content, pages, and lead capture."
      />

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 md:grid-cols-3">
        <Card className="gap-1 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total generations</p>
            <Sparkles className="size-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {formatNumber(data.totals.generations)}
          </p>
        </Card>
        <Card className="gap-1 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Tokens used</p>
            <Coins className="size-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {formatNumber(data.totals.tokensUsed)}
          </p>
        </Card>
        <Card className="gap-1 p-5 min-[420px]:col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page views</p>
            <FileText className="size-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {formatNumber(
              data.landingPages.reduce((sum, page) => sum + page.views, 0)
            )}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content generated</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={data.contentSeries}
              label="Generations"
              id="analytics-content"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads captured</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={data.leadSeries}
              label="Leads"
              id="analytics-leads"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content by type</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            {data.contentByType.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No content generated yet.
              </p>
            ) : (
              <ContentByTypeChart data={data.contentByType} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by source</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            {data.leadsBySource.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No leads captured yet.
              </p>
            ) : (
              <ul className="space-y-4">
                {data.leadsBySource.map((row) => (
                  <li key={row.source} className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">
                        {SOURCE_LABELS[row.source] ?? row.source}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {row.count}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[#3b82f6]"
                        style={{
                          width: `${(row.count / maxSourceCount) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Landing page performance</CardTitle>
          <CardDescription>Top pages by views</CardDescription>
        </CardHeader>
        <CardContent>
          {data.landingPages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No landing pages yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    Conversion
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.landingPages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell>
                      <Link
                        href={`/landing-pages/${page.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {page.title}
                      </Link>
                      <span className="ml-2 text-xs text-muted-foreground">
                        /p/{page.slug}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          page.status === "PUBLISHED" ? "default" : "secondary"
                        }
                      >
                        {page.status === "PUBLISHED" ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(page.views)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {page._count.leads}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                      {page.views > 0
                        ? `${((page._count.leads / page.views) * 100).toFixed(1)}%`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
