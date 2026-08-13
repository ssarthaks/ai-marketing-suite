"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, Kanban, Magnet, Plus, Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VisibilityBadge } from "@/components/visibility-badge";
import { LeadMagnetsKanbanBoard } from "@/features/lead-magnets/components/lead-magnets-kanban";
import { LEAD_MAGNET_TYPE_LABELS } from "@/lib/constants";
import { formatRelative } from "@/lib/format";

type LeadMagnetListItem = Awaited<
  ReturnType<typeof import("@/features/lead-magnets/server/lead-magnets.service").listLeadMagnets>
>[number];

interface LeadMagnetsViewProps {
  magnets: LeadMagnetListItem[];
}

export function LeadMagnetsView({ magnets }: LeadMagnetsViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "kanban">("kanban");

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          Showing {magnets.length} lead magnet{magnets.length === 1 ? "" : "s"}
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
        <LeadMagnetsKanbanBoard initialMagnets={magnets} />
      ) : magnets.length === 0 ? (
        <EmptyState
          icon={Magnet}
          title="No lead magnets yet"
          description="Create a checklist, guide, or PDF download. Visitors trade their email for it — every signup becomes a lead."
          action={
            <Button asChild>
              <Link href="/lead-magnets/new">
                <Plus className="size-4" />
                New lead magnet
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {magnets.map((magnet) => (
            <Card
              key={magnet.id}
              className="group relative gap-0 p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/lead-magnets/${magnet.id}`}>
                    <span className="absolute inset-0" aria-hidden />
                    <h3 className="truncate font-medium leading-snug">
                      {magnet.title}
                    </h3>
                  </Link>
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {LEAD_MAGNET_TYPE_LABELS[magnet.type]}
                    </Badge>
                    <Badge
                      variant={
                        magnet.status === "PUBLISHED" ? "default" : "outline"
                      }
                    >
                      {magnet.status === "PUBLISHED" ? "Published" : "Draft"}
                    </Badge>
                    <VisibilityBadge
                      visibility={magnet.visibility}
                      sharedCount={magnet.sharedWithUserIds?.length || 0}
                      createdByName={magnet.createdBy?.name || magnet.createdBy?.email}
                    />
                  </div>
                </div>
              </div>
              {magnet.description && (
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {magnet.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-4 border-t pt-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  {magnet._count.leads} leads
                </span>
                {magnet.campaign && (
                  <span className="truncate">{magnet.campaign.title}</span>
                )}
                <span className="ml-auto shrink-0">
                  {formatRelative(magnet.updatedAt)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
