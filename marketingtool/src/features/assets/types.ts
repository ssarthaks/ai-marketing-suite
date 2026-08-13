import type { AssetType, VisibilityStatus } from "@prisma/client";

export interface AssetDTO {
  id: string;
  name: string;
  folder: string;
  type: AssetType;
  mimeType: string;
  size: number;
  url: string;
  publicId: string;
  width: number | null;
  height: number | null;
  format: string | null;
  campaignId: string | null;
  visibility: VisibilityStatus;
  sharedWithUserIds: string[];
  uploadedBy?: { id: string; name: string; email: string } | null;
  createdAt: string;
}
