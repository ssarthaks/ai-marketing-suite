import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/server/db";
import { requireWorkspace } from "@/server/auth/session";
import { listCampaignOptions } from "@/features/campaigns/server/campaigns.service";
import { listUsersForSharing } from "@/features/users/server/users.service";
import { AiStudio } from "@/features/ai/components/ai-studio";
import { CONTENT_TYPE_LABELS, TONES, type Tone } from "@/lib/constants";
import { formatRelative } from "@/lib/format";

export const metadata: Metadata = {
  title: "AI Studio | Marketing OS - Standalone Asset Creation",
  description:
    "Generate one focused standalone marketing asset without duplicating research, email-drip, social, repurposing, optimization, or battlecard tools.",
};

// DeepSeek Pro can spend several minutes reasoning and using research tools.
export const maxDuration = 300;

export default async function AiStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { userId, workspaceId, productKey } = await requireWorkspace();
  const resolvedSearchParams = await searchParams;
  const isPersonalWorkspace = !productKey;

  const [campaigns, settings, recent, recentOrProjects, users] =
    await Promise.all([
      listCampaignOptions(workspaceId, userId),
      db.settings.findUnique({
        where: { workspaceId },
        select: { defaultTone: true },
      }),
      db.contentGeneration.findMany({
        where: {
          workspaceId,
          collection: "AI_STUDIO",
          OR: [
            { visibility: "PUBLIC" },
            { createdById: userId },
            { sharedWithUserIds: { has: userId } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          type: true,
          isFavorite: true,
          createdAt: true,
        },
      }),
      isPersonalWorkspace
        ? db.markdownFile.findMany({
            where: {
              filePath: { endsWith: "/product.md", startsWith: ".agents/" },
            },
            select: { filePath: true },
          })
        : Promise.resolve([]),
      listUsersForSharing(userId, workspaceId),
    ]);

  const availableProjects = isPersonalWorkspace
    ? (recentOrProjects
        .map((f: any) => {
          // extract 'xyz' from '.agents/xyz/product.md'
          const match = f.filePath.match(/\.agents\/(.*?)\/product\.md/);
          return match ? match[1] : null;
        })
        .filter(Boolean) as string[])
    : productKey
      ? [productKey]
      : [];

  const defaultTone: Tone = TONES.includes(settings?.defaultTone as Tone)
    ? (settings?.defaultTone as Tone)
    : "professional";

  const defaultCampaignId = campaigns.some(
    (campaign) => campaign.id === resolvedSearchParams.campaign,
  )
    ? resolvedSearchParams.campaign
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Studio"
        description="Generate one focused, on-brand standalone asset. Use the dedicated AI tools for research, audits, repurposing, email drips, organic social, and battlecards."
        actions={
          <Button asChild variant="outline">
            <Link
              href="https://internal-chatbot-test.vercel.app/"
              target="_blank"
            >
              Use AiAgent
            </Link>
          </Button>
        }
      />
      <AiStudio
        campaigns={campaigns}
        defaultCampaignId={defaultCampaignId}
        defaultTone={defaultTone}
        availableProjects={availableProjects}
        users={users}
      />
      {recent.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Recent generations
            </h2>
            <Link
              href="/library"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              View all
            </Link>
          </div>
          <Card className="py-2">
            <ul className="divide-y">
              {recent.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/library/${item.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {item.title}
                    </span>
                    {item.isFavorite && (
                      <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                    )}
                    <Badge variant="secondary">
                      {CONTENT_TYPE_LABELS[item.type]}
                    </Badge>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelative(item.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
