import type { Metadata } from "next";
import { AiSocialArchitectView } from "@/features/ai/components/ai-social-architect-view";

export const metadata: Metadata = {
  title: "AI Organic Social Architect | Marketing OS",
  description:
    "Create one organic platform asset with its publishing and engagement plan; paid ads and email are excluded.",
};

export default function AiSocialArchitectPage() {
  return <AiSocialArchitectView />;
}
