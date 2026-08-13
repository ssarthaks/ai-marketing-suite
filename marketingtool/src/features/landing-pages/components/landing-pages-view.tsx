"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, Kanban, PanelsTopLeft, Plus, Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VisibilityBadge } from "@/components/visibility-badge";
import { LandingPagesKanbanBoard } from "@/features/landing-pages/components/landing-pages-kanban";
import { formatRelative } from "@/lib/format";

type LandingPageListItem = Awaited<
  ReturnType<typeof import("@/features/landing-pages/server/landing-pages.service").listLandingPages>
>[number];

interface LandingPagesViewProps {
  pages: LandingPageListItem[];
}

export function LandingPagesView({ pages }: LandingPagesViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "kanban">("kanban");

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          Showing {pages.length} landing page{pages.length === 1 ? "" : "s"}
        </div>
        <div className="flex w-full items-center gap-1 rounded-lg border bg-muted/40 p-1 sm:w-auto">
          <Button
            type="button"
            variant={viewMode === "kanban" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("kanban")}
            className="h-7 flex-1 gap-1.5 px-2.5 text-xs sm:flex-none"
          >
            <Kanban className="size-3.5 text-purple-600" />
            Kanban Board
          </Button>
          <Button
            type="button"
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-7 flex-1 gap-1.5 px-2.5 text-xs sm:flex-none"
          >
            <LayoutGrid className="size-3.5" />
            Grid View
          </Button>
        </div>
      </div>

      {viewMode === "kanban" ? (
        <LandingPagesKanbanBoard initialPages={pages} />
      ) : pages.length === 0 ? (
        <EmptyState
          icon={PanelsTopLeft}
          title="No landing pages yet"
          description="Create a page from sections — hero, features, pricing, FAQ — and publish it at its own URL."
          action={
            <Button asChild>
              <Link href="/landing-pages/new">
                <Plus className="size-4" />
                New page
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Card
              key={page.id}
              className="group relative gap-0 p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/landing-pages/${page.id}`}>
                    <span className="absolute inset-0" aria-hidden />
                    <h3 className="truncate font-medium leading-snug">
                      {page.title}
                    </h3>
                  </Link>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    /p/{page.slug}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                  <Badge
                    variant={page.status === "PUBLISHED" ? "default" : "secondary"}
                  >
                    {page.status === "PUBLISHED" ? "Published" : "Draft"}
                  </Badge>
                  <VisibilityBadge
                    visibility={page.visibility}
                    sharedCount={page.sharedWithUserIds?.length || 0}
                    createdByName={page.createdBy?.name || page.createdBy?.email}
                  />
                </div>
              </div>
              {page.campaign && (
                <p className="mt-3 truncate text-xs text-muted-foreground">
                  Campaign: {page.campaign.title}
                </p>
              )}
              <div className="mt-4 flex items-center gap-4 border-t pt-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <PanelsTopLeft className="size-3.5" />
                  {page._count.sections} sections
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  {page._count.leads} leads
                </span>
                <span className="ml-auto">
                  {formatRelative(page.updatedAt)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
