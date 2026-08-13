import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireWorkspace } from "@/server/auth/session";
import { listCampaignOptions } from "@/features/campaigns/server/campaigns.service";
import { listUsersForSharing } from "@/features/users/server/users.service";
import { CreatePageForm } from "@/features/landing-pages/components/create-page-form";

export const metadata: Metadata = {
  title: "New Landing Page | Marketing OS - Create Conversion Page",
  description:
    "Build a new high-converting landing page from scratch with customizable modular sections and public slug.",
};

export default async function NewLandingPagePage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { userId, workspaceId } = await requireWorkspace();
  const params = await searchParams;
  const campaigns = await listCampaignOptions(workspaceId, userId);

  const defaultCampaignId = campaigns.some(
    (campaign) => campaign.id === params.campaign
  )
    ? params.campaign
    : undefined;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="New landing page"
        description="Starts with a hero, features, and CTA — customize everything after."
      />
      <Card>
        <CardContent>
          <CreatePageForm
            campaigns={campaigns}
            defaultCampaignId={defaultCampaignId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
