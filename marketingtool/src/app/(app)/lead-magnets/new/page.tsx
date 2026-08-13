import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/server/db";
import { requireWorkspace } from "@/server/auth/session";
import { listCampaignOptions } from "@/features/campaigns/server/campaigns.service";
import { listUsersForSharing } from "@/features/users/server/users.service";
import { LeadMagnetForm } from "@/features/lead-magnets/components/lead-magnet-form";

export const metadata: Metadata = {
  title: "New Lead Magnet | Marketing OS - Create Gated Content Offer",
  description:
    "Design a new lead magnet opt-in offer to generate subscriber leads and deliver instant resource downloads.",
};

export default async function NewLeadMagnetPage() {
  const { userId, workspaceId } = await requireWorkspace();

  const [campaigns, assets] = await Promise.all([
    listCampaignOptions(workspaceId, userId),
    db.asset.findMany({
      where: { workspaceId, type: "PDF" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="New lead magnet"
        description="Create the offer first — publish it when the content is ready."
      />
      <Card>
        <CardContent>
          <LeadMagnetForm campaigns={campaigns} assets={assets} />
        </CardContent>
      </Card>
    </div>
  );
}
