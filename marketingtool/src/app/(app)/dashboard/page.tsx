import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  FolderOpen,
  LayoutDashboard,
  Megaphone,
  PanelsTopLeft,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireWorkspace } from "@/server/auth/session";
import { ActivityFeed } from "@/features/activity/components/activity-feed";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { TrendChart } from "@/features/dashboard/components/trend-chart";
import { getDashboardData } from "@/features/dashboard/server/dashboard.service";
import { formatRelative } from "@/lib/format";

import { listUsersForSharing } from "@/features/users/server/users.service";
import { TeamPresenceBar } from "@/components/team-presence-bar";
import { getGenerationDisplayLabel } from "@/lib/content-display";

export const metadata: Metadata = {
  title: "Dashboard | Marketing OS - Workspace Overview & Metrics",
  description:
    "Monitor real-time marketing performance stats, AI content generation activity, active campaigns, and lead acquisition trends across your workspace.",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const { userId, workspaceId, workspaceName, productKey, name } =
    await requireWorkspace();
  const [data, users] = await Promise.all([
    getDashboardData(workspaceId, userId),
    listUsersForSharing(userId, workspaceId, true),
  ]);
  const firstName = name.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening in your workspace.
          </p>
        </div>
        <Button asChild>
          <Link href="/ai-studio">
            <Sparkles className="size-4" />
            Generate content
          </Link>
        </Button>
      </div>

      <TeamPresenceBar
        users={users}
        currentUserId={userId}
        workspaceName={workspaceName}
      />

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Campaigns"
          value={data.counts.campaigns}
          icon={Megaphone}
          href="/campaigns"
        />
        <StatCard
          label="AI content"
          value={data.counts.content}
          icon={FileText}
          href="/library"
        />
        <StatCard
          label="Assets"
          value={data.counts.assets}
          icon={FolderOpen}
          href="/assets"
        />
        <StatCard
          label="Landing pages"
          value={data.counts.landingPages}
          icon={PanelsTopLeft}
          href="/landing-pages"
        />
        <StatCard
          label="Leads"
          value={data.counts.leads}
          icon={Users}
          href="/leads"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Content generated</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={data.contentSeries}
              label="Generations"
              id="content"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed activities={data.activities} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle className="text-base">Recent AI usage</CardTitle>
              <CardDescription>
                Latest generations and token spend
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/library">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentGenerations.length === 0 ? (
              <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
                <LayoutDashboard className="size-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Generations will show up here.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {data.recentGenerations.map((generation) => (
                  <li key={generation.id}>
                    <Link
                      href={`/library/${generation.id}`}
                      className="flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {generation.title}
                      </span>
                      <Badge variant="secondary">
                        {getGenerationDisplayLabel(generation)}
                      </Badge>
                      <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {generation.tokensUsed === null
                          ? "—"
                          : `${generation.tokensUsed.toLocaleString()} tok`}
                      </span>
                      <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground sm:block">
                        {formatRelative(generation.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads captured</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart data={data.leadSeries} label="Leads" id="leads" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
