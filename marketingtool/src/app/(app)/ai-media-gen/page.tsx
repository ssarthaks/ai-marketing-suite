import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireWorkspace } from "@/server/auth/session";
import { listCampaignOptions } from "@/features/campaigns/server/campaigns.service";
import { AiMediaGenerator } from "@/features/ai-media/components/ai-media-generator";

export const metadata: Metadata = {
  title: "AI Image/Video Gen (Beta) | Marketing OS",
  description:
    "Generate photorealistic images, dynamic AI videos, audio, and voices powered by Pollinations.ai infrastructure.",
};

export default async function AiMediaGenPage() {
  const { userId, workspaceId } = await requireWorkspace();

  const campaigns = await listCampaignOptions(workspaceId, userId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Image / Video Gen (Beta)"
        description="Unified multimedia creation suite powered by Pollinations.ai open-source models for images, video, speech, and dialogue."
        actions={
          <Button asChild variant="outline">
            <Link href="https://pollinations.ai" target="_blank" rel="noopener noreferrer">
              Pollinations.ai Docs
            </Link>
          </Button>
        }
      />
      <AiMediaGenerator campaigns={campaigns} />
    </div>
  );
}
