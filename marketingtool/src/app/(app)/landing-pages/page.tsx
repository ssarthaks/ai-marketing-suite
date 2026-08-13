import type { Metadata } from "next";
import Link from "next/link";
import { PanelsTopLeft, Plus, Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireWorkspace } from "@/server/auth/session";
import { listLandingPages } from "@/features/landing-pages/server/landing-pages.service";
import { LandingPagesView } from "@/features/landing-pages/components/landing-pages-view";

export const metadata: Metadata = {
  title: "Landing Pages | Marketing OS - No-Code Page Builder",
  description:
    "Build, publish, and track modular landing pages with responsive sections, lead capture forms, and custom public URLs.",
};

export default async function LandingPagesPage() {
  const { userId, workspaceId } = await requireWorkspace();
  const pages = await listLandingPages(workspaceId, userId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Landing pages"
        description="Build and publish conversion pages — no code, no deploys."
        actions={
          <Button asChild>
            <Link href="/landing-pages/new">
              <Plus className="size-4" />
              New page
            </Link>
          </Button>
        }
      />
      <LandingPagesView pages={pages} />
    </div>
  );
}
