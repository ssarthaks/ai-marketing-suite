import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/server/db";
import { requireWorkspace } from "@/server/auth/session";
import { CampaignForm } from "@/features/campaigns/components/campaign-form";
import { visibilityWhereClause } from "@/lib/visibility";

export const metadata: Metadata = {
  title: "Edit campaign",
};

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, workspaceId } = await requireWorkspace();
  const { id } = await params;

  const campaign = await db.campaign.findFirst({
    where: { id, workspaceId, ...visibilityWhereClause(userId) },
  });
  if (!campaign) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Edit campaign" description={campaign.title} />
      <Card>
        <CardContent>
          <CampaignForm
            campaignId={campaign.id}
            defaultValues={{
              title: campaign.title,
              description: campaign.description ?? "",
              audience: campaign.audience ?? "",
              product: campaign.product ?? "",
              objective: campaign.objective ?? "",
              budget: campaign.budget === null ? "" : String(campaign.budget),
              startDate: campaign.startDate ?? undefined,
              endDate: campaign.endDate ?? undefined,
              status: campaign.status,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
