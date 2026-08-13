import type { Metadata } from "next";
import { AiEmailCampaignsView } from "@/features/ai/components/ai-email-campaigns-view";

export const metadata: Metadata = {
  title: "AI Email Drip Generator | Marketing OS",
  description:
    "Generate a four-step email-only lifecycle sequence with distinct timing, purpose, A/B subject lines, bodies, and CTA buttons.",
};

export default function AiEmailCampaignsPage() {
  return <AiEmailCampaignsView />;
}
