import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { AiOptimizerView } from "@/features/ai/components/ai-optimizer-view";

export const metadata: Metadata = {
  title: "AI Copy Strategy Audit | Marketing OS",
  description:
    "Diagnose supplied copy, prioritize fixes, propose localized line edits, and define a measurable test plan.",
};

export default async function AiOptimizerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Copy Strategy Audit"
        description="Diagnose an existing draft with an honest score, prioritized fixes, localized line edits, and a test plan—not replacement campaigns."
      />
      <AiOptimizerView />
    </div>
  );
}
