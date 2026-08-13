"use client";

import { useState } from "react";
import Link from "next/link";
import { CampaignStatus } from "@prisma/client";
import { LayoutGrid, Kanban, Megaphone, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { CampaignCard } from "@/features/campaigns/components/campaign-card";
import { CampaignsKanbanBoard } from "@/features/campaigns/components/campaigns-kanban";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CampaignListItem } from "@/features/campaigns/server/campaigns.service";

interface CampaignsViewProps {
  campaigns: CampaignListItem[];
  allCampaigns: CampaignListItem[];
  currentStatus?: CampaignStatus;
}

const FILTERS = [
  { value: undefined, label: "All" },
  ...Object.values(CampaignStatus).map((status) => ({
    value: status,
    label: CAMPAIGN_STATUS_LABELS[status],
  })),
];

export function CampaignsView({
  campaigns,
  allCampaigns,
  currentStatus,
}: CampaignsViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "kanban">("kanban");

  return (
    <div className="space-y-5">
      {/* Toolbar: Filters & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-full flex-wrap items-center gap-1.5">
          {FILTERS.map((filter) => {
            const isActive = filter.value === currentStatus;
            return (
              <Link
                key={filter.label}
                href={
                  filter.value
                    ? `/campaigns?status=${filter.value.toLowerCase()}`
                    : `/campaigns`
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  isActive
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>

        {/* View Mode Segment Switcher */}
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

      {/* Main Content Area */}
      {viewMode === "kanban" ? (
        <CampaignsKanbanBoard
          initialCampaigns={allCampaigns}
        />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={currentStatus ? "No campaigns with this status" : "No campaigns yet"}
          description={
            currentStatus
              ? "Try a different filter, or create a new campaign."
              : "Create your first campaign to organize content, assets, and landing pages around one goal."
          }
          action={
            <Button asChild>
              <Link href="/campaigns/new">
                <Plus className="size-4" />
                New campaign
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}
