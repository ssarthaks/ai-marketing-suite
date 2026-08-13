import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { AiResearchView } from "@/features/ai/components/ai-research-view";

export const metadata: Metadata = {
  title: "AI EdTech Market Intelligence | Marketing OS",
  description:
    "Evidence-oriented market landscape, audience insights, demand signals, and research gaps without campaign copy.",
};

export default async function AiResearchPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI EdTech Market Intelligence"
        description="Analyze product evidence into market landscape, audience insights, demand signals, and explicit evidence gaps—without generating campaign assets."
      />
      <AiResearchView />
    </div>
  );
}
