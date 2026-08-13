import type { Metadata } from "next";
import Link from "next/link";
import { ContentType } from "@prisma/client";
import { LibraryBig, Sparkles, Star } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireWorkspace } from "@/server/auth/session";
import { listCampaignOptions } from "@/features/campaigns/server/campaigns.service";
import { ContentActionsMenu } from "@/features/library/components/content-actions-menu";
import { LibraryToolbar } from "@/features/library/components/library-toolbar";
import {
  listCollections,
  listContent,
} from "@/features/library/server/library.service";
import { VisibilityBadge } from "@/components/visibility-badge";
import {
  getCollectionDisplayLabel,
  getGenerationDisplayLabel,
} from "@/lib/content-display";
import { formatRelative, getReadableContentText, getProjectBadgeLabel } from "@/lib/format";

export const metadata: Metadata = {
  title: "Content Library | Marketing OS - Saved Copy Vault & Generations",
  description:
    "Organize, review, edit, favorite, and export all your AI-generated marketing content, copy variations, and saved drafts.",
};

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    campaign?: string;
    collection?: string;
    scope?: string;
    favorites?: string;
  }>;
}) {
  const { userId, workspaceId, workspaceName } = await requireWorkspace();
  const resolvedSearchParams = await searchParams;

  const type = Object.values(ContentType).find(
    (value) => value === resolvedSearchParams.type
  );

  const scope = ["mine", "shared", "public", "private"].includes(
    resolvedSearchParams.scope ?? ""
  )
    ? (resolvedSearchParams.scope as "mine" | "shared" | "public" | "private")
    : undefined;

  const [items, campaigns, collections] = await Promise.all([
    listContent(
      workspaceId,
      {
        query: resolvedSearchParams.q,
        type,
        campaignId: resolvedSearchParams.campaign,
        collection: resolvedSearchParams.collection,
        scope,
        favoritesOnly: resolvedSearchParams.favorites === "1",
      },
      userId
    ),
    listCampaignOptions(workspaceId, userId),
    listCollections(workspaceId, userId),
  ]);

  const hasFilters = Boolean(
    resolvedSearchParams.q ||
      resolvedSearchParams.type ||
      resolvedSearchParams.campaign ||
      resolvedSearchParams.collection ||
      resolvedSearchParams.scope ||
      resolvedSearchParams.favorites
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Library"
        description="Every AI generation, saved and searchable."
        actions={
          <Button asChild>
            <Link href="/ai-studio">
              <Sparkles className="size-4" />
              Generate
            </Link>
          </Button>
        }
      />
      {items.length === 0 && !hasFilters ? (
        <EmptyState
          icon={LibraryBig}
          title="Your library is empty"
          description="Generate your first piece of content in the AI Studio — everything you create lands here automatically."
          action={
            <Button asChild>
              <Link href="/ai-studio">
                <Sparkles className="size-4" />
                Open AI Studio
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <LibraryToolbar campaigns={campaigns} collections={collections} />
          {items.length === 0 ? (
            <EmptyState
              icon={LibraryBig}
              title="Nothing matches"
              description="Try a different search or clear some filters."
              className="min-h-[220px]"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="group relative gap-0 p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/library/${item.id}`}
                      className="min-w-0 focus-visible:outline-none"
                    >
                      <span className="absolute inset-0" aria-hidden />
                      <h3 className="line-clamp-2 text-sm font-medium leading-snug">
                        {item.title}
                      </h3>
                    </Link>
                    <div className="relative z-10 flex shrink-0 items-center gap-1">
                      {item.isFavorite && (
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      )}
                      <ContentActionsMenu
                        contentId={item.id}
                        contentTitle={item.title}
                        isFavorite={item.isFavorite}
                      />
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {getReadableContentText(item.content)}
                  </p>
                  <div className="mt-4 flex items-center gap-2 flex-wrap border-t pt-4 text-xs text-muted-foreground">
                    <Badge variant="secondary">
                      {getGenerationDisplayLabel(item)}
                    </Badge>
                    <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-medium">
                      {getProjectBadgeLabel(item)}
                    </Badge>
                    <VisibilityBadge
                      visibility={item.visibility}
                      sharedCount={item.sharedWithUserIds?.length || 0}
                      createdByName={item.createdBy?.name || item.createdBy?.email}
                    />
                    <Badge
                      variant="outline"
                      className="border-primary/30 bg-primary/5 text-primary"
                    >
                      {workspaceName}
                    </Badge>
                    {item.collection && (
                      <Badge variant="outline">
                        {getCollectionDisplayLabel(item.collection)}
                      </Badge>
                    )}
                    <span className="ml-auto truncate">
                      {item.campaign?.title ?? formatRelative(item.createdAt)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
