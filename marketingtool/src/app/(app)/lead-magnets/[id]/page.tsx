import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/server/db";
import { requireWorkspace } from "@/server/auth/session";
import { listCampaignOptions } from "@/features/campaigns/server/campaigns.service";
import { LeadMagnetForm } from "@/features/lead-magnets/components/lead-magnet-form";
import { MagnetEditorHeader } from "@/features/lead-magnets/components/magnet-editor-header";
import { getLeadMagnetForEditor } from "@/features/lead-magnets/server/lead-magnets.service";

export const metadata: Metadata = {
  title: "Edit lead magnet",
};

export default async function EditLeadMagnetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, workspaceId } = await requireWorkspace();
  const { id } = await params;

  const [magnet, campaigns, assets] = await Promise.all([
    getLeadMagnetForEditor(workspaceId, id, userId),
    listCampaignOptions(workspaceId, userId),
    db.asset.findMany({
      where: { workspaceId, type: "PDF" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!magnet) notFound();

  return (
    <div className="space-y-6">
      <MagnetEditorHeader
        magnet={{
          id: magnet.id,
          title: magnet.title,
          slug: magnet.slug,
          status: magnet.status,
          leadCount: magnet.leadCount,
        }}
      />
      <Card>
        <CardContent>
          <LeadMagnetForm
            magnetId={magnet.id}
            campaigns={campaigns}
            assets={assets}
            defaultValues={{
              title: magnet.title,
              type: magnet.type,
              description: magnet.description ?? "",
              body: magnet.body,
              assetId: magnet.assetId ?? undefined,
              campaignId: magnet.campaignId ?? undefined,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
