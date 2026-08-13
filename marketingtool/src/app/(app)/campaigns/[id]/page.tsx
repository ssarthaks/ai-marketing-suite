import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  FolderOpen,
  PanelsTopLeft,
  Plus,
  Sparkles,
  Star,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { requireWorkspace } from "@/server/auth/session";
import { ActivityFeed } from "@/features/activity/components/activity-feed";
import { CampaignActionsMenu } from "@/features/campaigns/components/campaign-actions-menu";
import { CampaignNotesEditor } from "@/features/campaigns/components/campaign-notes-editor";
import { CampaignStatusBadge } from "@/features/campaigns/components/campaign-status-badge";
import { VisibilityBadge } from "@/components/visibility-badge";
import {
  getCampaignActivities,
  getCampaignDetail,
} from "@/features/campaigns/server/campaigns.service";
import { CONTENT_TYPE_LABELS } from "@/lib/constants";
import {
  formatCurrency,
  formatDate,
  formatDateRange,
  formatRelative,
} from "@/lib/format";

export const metadata: Metadata = {
  title: "Campaign",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, workspaceId } = await requireWorkspace();
  const { id } = await params;

  const campaign = await getCampaignDetail(workspaceId, id, userId);
  if (!campaign) notFound();

  const activities = await getCampaignActivities(workspaceId, id, userId);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/campaigns"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Campaigns
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {campaign.title}
            </h1>
            <CampaignStatusBadge status={campaign.status} />
            <VisibilityBadge
              visibility={campaign.visibility}
              sharedCount={campaign.sharedWithUserIds?.length || 0}
              createdByName={campaign.createdBy?.name || campaign.createdBy?.email}
            />
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button asChild variant="outline" size="sm">
              <Link href={`/ai-studio?campaign=${campaign.id}`}>
                <Sparkles className="size-4" />
                Generate content
              </Link>
            </Button>
            <CampaignActionsMenu
              campaignId={campaign.id}
              campaignTitle={campaign.title}
              currentStatus={campaign.status}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="content">
            Content
            <Badge variant="secondary" className="ml-1.5">
              {campaign._count.contentGenerations}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="assets">
            Assets
            <Badge variant="secondary" className="ml-1.5">
              {campaign._count.assets}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pages">
            Pages
            <Badge variant="secondary" className="ml-1.5">
              {campaign._count.landingPages}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {campaign.description || "No description yet."}
                </p>
                <dl className="divide-y">
                  <DetailRow
                    label="Audience"
                    value={campaign.audience || "—"}
                  />
                  <DetailRow label="Product" value={campaign.product || "—"} />
                  <DetailRow
                    label="Objective"
                    value={campaign.objective || "—"}
                  />
                  <DetailRow
                    label="Budget"
                    value={formatCurrency(campaign.budget)}
                  />
                  <DetailRow
                    label="Timeline"
                    value={formatDateRange(
                      campaign.startDate,
                      campaign.endDate
                    )}
                  />
                  <DetailRow
                    label="Created"
                    value={formatDate(campaign.createdAt)}
                  />
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityFeed
                  activities={activities}
                  emptyDescription="Campaign activity will show up here."
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign notes</CardTitle>
            </CardHeader>
            <CardContent>
              <CampaignNotesEditor
                campaignId={campaign.id}
                initialNotes={campaign.notes ?? ""}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="mt-4">
          {campaign.contentGenerations.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No content yet"
              description="Generate AI content for this campaign — it will be linked here automatically."
              action={
                <Button asChild>
                  <Link href={`/ai-studio?campaign=${campaign.id}`}>
                    <Sparkles className="size-4" />
                    Open AI Studio
                  </Link>
                </Button>
              }
            />
          ) : (
            <Card className="py-2">
              <ul className="divide-y">
                {campaign.contentGenerations.map((content) => (
                  <li key={content.id}>
                    <Link
                      href={`/library/${content.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                    >
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {content.title}
                      </span>
                      {content.isFavorite && (
                        <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                      )}
                      <Badge variant="secondary">
                        {CONTENT_TYPE_LABELS[content.type]}
                      </Badge>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelative(content.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          {campaign.assets.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No assets yet"
              description="Upload brand assets and attach them to this campaign from the Asset Manager."
              action={
                <Button asChild>
                  <Link href="/assets">
                    <Plus className="size-4" />
                    Open Assets
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {campaign.assets.map((asset) => (
                <Link
                  key={asset.id}
                  href="/assets"
                  className="group overflow-hidden rounded-lg border bg-muted/30"
                >
                  <div className="relative aspect-square">
                    {asset.type === "IMAGE" ? (
                      <Image
                        src={asset.url}
                        alt={asset.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 160px"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <FileText className="size-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="truncate px-2 py-1.5 text-xs">{asset.name}</p>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pages" className="mt-4">
          {campaign.landingPages.length === 0 ? (
            <EmptyState
              icon={PanelsTopLeft}
              title="No landing pages yet"
              description="Build a landing page for this campaign and publish it in minutes."
              action={
                <Button asChild>
                  <Link href={`/landing-pages/new?campaign=${campaign.id}`}>
                    <Plus className="size-4" />
                    New landing page
                  </Link>
                </Button>
              }
            />
          ) : (
            <Card className="py-2">
              <ul className="divide-y">
                {campaign.landingPages.map((page) => (
                  <li key={page.id}>
                    <Link
                      href={`/landing-pages/${page.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                    >
                      <PanelsTopLeft className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {page.title}
                      </span>
                      <Badge
                        variant={
                          page.status === "PUBLISHED" ? "default" : "secondary"
                        }
                      >
                        {page.status === "PUBLISHED" ? "Published" : "Draft"}
                      </Badge>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {page.views} views
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
