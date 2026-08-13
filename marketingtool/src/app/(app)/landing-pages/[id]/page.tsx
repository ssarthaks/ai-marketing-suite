import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireWorkspace } from "@/server/auth/session";
import { PageEditor } from "@/features/landing-pages/components/page-editor";
import { getLandingPageForEditor } from "@/features/landing-pages/server/landing-pages.service";

export const metadata: Metadata = {
  title: "Edit landing page",
};

export default async function LandingPageEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, workspaceId } = await requireWorkspace();
  const { id } = await params;

  const page = await getLandingPageForEditor(workspaceId, id, userId);
  if (!page) notFound();

  return <PageEditor page={page} />;
}
