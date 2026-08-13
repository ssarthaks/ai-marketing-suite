import type { Metadata } from "next";
import { AssetType } from "@prisma/client";
import { FolderOpen } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireWorkspace } from "@/server/auth/session";
import { listCampaignOptions } from "@/features/campaigns/server/campaigns.service";
import {
  listAssetFolders,
  listAssets,
} from "@/features/assets/server/assets.service";
import { listUsersForSharing } from "@/features/users/server/users.service";
import { AssetsExplorer } from "@/features/assets/components/assets-explorer";
import { UploadDialog } from "@/features/assets/components/upload-dialog";

export const metadata: Metadata = {
  title: "Media Assets | Marketing OS - Creative Asset Management",
  description:
    "Upload and manage brand media files, logos, product graphics, and video resources for your landing pages and marketing campaigns.",
};

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; folder?: string; type?: string }>;
}) {
  const { userId, workspaceId } = await requireWorkspace();
  const resolvedSearchParams = await searchParams;

  const type = Object.values(AssetType).find(
    (value) => value === resolvedSearchParams.type
  );

  const [assets, folders, campaigns, users] = await Promise.all([
    listAssets(workspaceId, {
      query: resolvedSearchParams.q,
      folder: resolvedSearchParams.folder,
      type,
    }, userId),
    listAssetFolders(workspaceId, userId),
    listCampaignOptions(workspaceId, userId),
    listUsersForSharing(userId, workspaceId),
  ]);

  const hasFilters = Boolean(resolvedSearchParams.q || resolvedSearchParams.folder || resolvedSearchParams.type);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description="Brand files, product shots, and creatives — organized and searchable."
        actions={<UploadDialog campaigns={campaigns} folders={folders} users={users} />}
      />
      {assets.length === 0 && !hasFilters ? (
        <EmptyState
          icon={FolderOpen}
          title="No assets yet"
          description="Upload images, videos, and PDFs. Everything is stored on Cloudinary and served from a fast CDN."
        />
      ) : assets.length === 0 ? (
        <div className="space-y-4">
          <AssetsExplorer assets={assets} folders={folders} />
          <EmptyState
            icon={FolderOpen}
            title="Nothing matches"
            description="Try a different search, folder, or type filter."
            className="min-h-[220px]"
          />
        </div>
      ) : (
        <AssetsExplorer assets={assets} folders={folders} />
      )}
    </div>
  );
}
