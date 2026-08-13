import type { Metadata } from "next";
import Link from "next/link";
import { Magnet, Plus, Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireWorkspace } from "@/server/auth/session";
import { listLeadMagnets } from "@/features/lead-magnets/server/lead-magnets.service";
import { LeadMagnetsView } from "@/features/lead-magnets/components/lead-magnets-view";

export const metadata: Metadata = {
  title: "Lead Magnets | Marketing OS - Gated Content & Lead Capture",
  description:
    "Create downloadable guides, checklists, and gated resources to capture emails and convert visitors into leads.",
};

export default async function LeadMagnetsPage() {
  const { userId, workspaceId } = await requireWorkspace();
  const magnets = await listLeadMagnets(workspaceId, userId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead magnets"
        description="Gated checklists, guides, and downloads that turn visitors into leads."
        actions={
          <Button asChild>
            <Link href="/lead-magnets/new">
              <Plus className="size-4" />
              New lead magnet
            </Link>
          </Button>
        }
      />
      <LeadMagnetsView magnets={magnets} />
    </div>
  );
}
