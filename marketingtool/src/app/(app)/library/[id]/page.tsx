import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireWorkspace } from "@/server/auth/session";
import { ContentActionsMenu } from "@/features/library/components/content-actions-menu";
import { ContentEditor } from "@/features/library/components/content-editor";
import {
  getContentDetail,
  listCollections,
} from "@/features/library/server/library.service";
import { getGenerationDisplayLabel } from "@/lib/content-display";
import { formatDate, formatContentToMarkdown, getPlainTextContent } from "@/lib/format";

export const metadata: Metadata = {
  title: "Content",
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, workspaceId } = await requireWorkspace();
  const { id } = await params;

  const [content, collections] = await Promise.all([
    getContentDetail(workspaceId, id, userId),
    listCollections(workspaceId, userId),
  ]);
  if (!content) notFound();

  const formattedMarkdown = formatContentToMarkdown(content.content);
  const plainTextContent = getPlainTextContent(content.content);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/library"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Content Library
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {content.title}
            </h1>
            <Badge variant="secondary">
              {getGenerationDisplayLabel(content)}
            </Badge>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <CopyButton value={plainTextContent} label="Copy content" />
            <ContentActionsMenu
              contentId={content.id}
              contentTitle={content.title}
              isFavorite={content.isFavorite}
              redirectOnDelete
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <ContentEditor
              contentId={content.id}
              collections={collections}
              defaultValues={{
                title: content.title,
                content: formattedMarkdown,
                collection: content.collection ?? "",
              }}
            />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <MetaRow
                  label="Type"
                  value={getGenerationDisplayLabel(content)}
                />
                <MetaRow label="Tone" value={content.tone ?? "—"} />
                <MetaRow label="Audience" value={content.audience ?? "—"} />
                <MetaRow label="Goal" value={content.goal ?? "—"} />
                <MetaRow
                  label="Campaign"
                  value={content.campaign?.title ?? "—"}
                />
                <MetaRow label="Model" value={content.model} />
                <MetaRow
                  label="Tokens"
                  value={
                    content.tokensUsed === null
                      ? "—"
                      : content.tokensUsed.toLocaleString()
                  }
                />
                <MetaRow
                  label="Created"
                  value={formatDate(content.createdAt)}
                />
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Original brief</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {content.prompt}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
