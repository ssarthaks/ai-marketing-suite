import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CampaignForm } from "@/features/campaigns/components/campaign-form";
import { requireWorkspace } from "@/server/auth/session";

import { listUsersForSharing } from "@/features/users/server/users.service";

export const metadata: Metadata = {
  title: "New Campaign | Marketing OS - Launch Campaign Strategy",
  description:
    "Launch a new marketing campaign by specifying target objectives, audience demographics, budget, and timeline.",
};

export default async function NewCampaignPage() {
  const { userId, workspaceId, productKey } = await requireWorkspace();
  const users = await listUsersForSharing(userId, workspaceId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="New campaign"
        description="Give the campaign a goal — the AI Studio will use it as context."
      />
      <Card>
        <CardContent>
          <CampaignForm isPersonalWorkspace={!productKey} users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
