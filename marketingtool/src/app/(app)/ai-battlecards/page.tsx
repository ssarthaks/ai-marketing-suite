import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { requireWorkspace } from "@/server/auth/session";
import { AiBattlecardsView } from "@/features/ai/components/ai-battlecards-view";

export const metadata: Metadata = {
  title: "AI Competitor Battlecards | Marketing OS",
  description:
    "Create evidence-safe comparison matrices, decision criteria, objection talk tracks, and discovery questions.",
};

export default async function AiBattlecardsPage() {
  await requireWorkspace();

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Competitor Battlecards"
        description="Equip sales teams with evidence-safe comparisons, decision criteria, objection talk tracks, and discovery questions—not channel copy."
      />
      <AiBattlecardsView />
    </div>
  );
}
