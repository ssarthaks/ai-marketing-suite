import Link from "next/link";
import { CalendarRange, FileText, FolderOpen, PanelsTopLeft } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatCurrency, formatDateRange } from "@/lib/format";
import type { CampaignListItem } from "@/features/campaigns/server/campaigns.service";
import { CampaignActionsMenu } from "./campaign-actions-menu";
import { CampaignStatusBadge } from "./campaign-status-badge";
import { VisibilityBadge } from "@/components/visibility-badge";

export function CampaignCard({ campaign }: { campaign: CampaignListItem }) {
  return (
    <Card className="group relative gap-0 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/campaigns/${campaign.id}`}
            className="focus-visible:outline-none"
          >
            <span className="absolute inset-0" aria-hidden />
            <h3 className="truncate font-medium leading-snug">
              {campaign.title}
            </h3>
          </Link>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <CampaignStatusBadge status={campaign.status} />
            <VisibilityBadge
              visibility={campaign.visibility}
              sharedCount={campaign.sharedWithUserIds?.length || 0}
              createdByName={campaign.createdBy?.name || campaign.createdBy?.email}
            />
          </div>
        </div>
        <div className="relative z-10">
          <CampaignActionsMenu
            campaignId={campaign.id}
            campaignTitle={campaign.title}
            currentStatus={campaign.status}
          />
        </div>
      </div>
      {campaign.description && (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {campaign.description}
        </p>
      )}
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarRange className="size-3.5" />
        <span>{formatDateRange(campaign.startDate, campaign.endDate)}</span>
        {campaign.budget !== null && (
          <>
            <span aria-hidden>·</span>
            <span>{formatCurrency(campaign.budget)}</span>
          </>
        )}
      </div>
      <div className="mt-4 flex items-center gap-4 border-t pt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <FileText className="size-3.5" />
          {campaign._count.contentGenerations} content
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FolderOpen className="size-3.5" />
          {campaign._count.assets} assets
        </span>
        <span className="inline-flex items-center gap-1.5">
          <PanelsTopLeft className="size-3.5" />
          {campaign._count.landingPages} pages
        </span>
      </div>
    </Card>
  );
}
