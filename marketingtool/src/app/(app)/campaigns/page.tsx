import type { Metadata } from "next";
import Link from "next/link";
import { CampaignStatus } from "@prisma/client";
import { Megaphone, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireWorkspace } from "@/server/auth/session";
import { listCampaigns } from "@/features/campaigns/server/campaigns.service";
import { CampaignsView } from "@/features/campaigns/components/campaigns-view";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Campaigns | Marketing OS - Multi-Channel Strategy & Execution",
  description:
    "Plan, launch, and track multi-channel marketing campaigns with audience demographics, budget management, and linked conversion assets.",
};

const FILTERS = [
  { value: undefined, label: "All" },
  ...Object.values(CampaignStatus).map((status) => ({
    value: status,
    label: CAMPAIGN_STATUS_LABELS[status],
  })),
];

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { userId, workspaceId } = await requireWorkspace();
  const resolvedSearchParams = await searchParams;

  const status = Object.values(CampaignStatus).find(
    (value) => value.toLowerCase() === resolvedSearchParams.status?.toLowerCase()
  );

  const [campaigns, allCampaigns] = await Promise.all([
    listCampaigns(workspaceId, { status }, userId),
    listCampaigns(workspaceId, {}, userId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Plan, run, and track every marketing campaign in one place."
        actions={
          <Button asChild>
            <Link href="/campaigns/new">
              <Plus className="size-4" />
              New campaign
            </Link>
          </Button>
        }
      />
      <CampaignsView
        campaigns={campaigns}
        allCampaigns={allCampaigns}
        currentStatus={status}
      />
    </div>
  );
}
