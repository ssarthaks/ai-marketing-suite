import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { requireWorkspace } from "@/server/auth/session";
import { AiRepurposerView } from "@/features/ai/components/ai-repurposer-view";

export const metadata: Metadata = {
  title: "AI Content Repurposing Blueprint | Marketing OS",
  description:
    "Decompose source content into a core narrative, reusable content atoms, derivative briefs, and a governed reuse plan.",
};

export default async function AiRepurposerPage() {
  await requireWorkspace();

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Content Repurposer"
        description="Turn existing source material into a repurposing blueprint and production briefs—without duplicating finished email, social, video, or ad generators."
      />
      <AiRepurposerView />
    </div>
  );
}
