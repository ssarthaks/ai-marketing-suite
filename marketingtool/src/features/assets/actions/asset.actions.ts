"use server";

import { revalidatePath } from "next/cache";
import type { AssetType, VisibilityStatus } from "@prisma/client";

import { db } from "@/server/db";
import { requireWorkspace } from "@/server/auth/session";
import { logActivity } from "@/server/activity";
import {
  createUploadSignature,
  destroyUpload,
  verifyUpload,
  workspaceFolder,
  type UploadSignature,
} from "@/server/cloudinary";
import { env } from "@/lib/env";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  saveAssetSchema,
  type SaveAssetInput,
} from "@/features/assets/schemas/asset.schema";
import type { AssetDTO } from "@/features/assets/types";
import { managementWhereClause } from "@/lib/visibility";
import { visibilityWhereClause } from "@/lib/visibility";
import { rateLimit } from "@/lib/rate-limit";
import { opaqueRateLimitKey } from "@/lib/request-security";

const ALLOWED_FORMATS = new Map<
  string,
  { type: AssetType; mimeType: string; maxBytes: number }
>([
  ["jpg", { type: "IMAGE", mimeType: "image/jpeg", maxBytes: 25 * 1024 * 1024 }],
  ["jpeg", { type: "IMAGE", mimeType: "image/jpeg", maxBytes: 25 * 1024 * 1024 }],
  ["png", { type: "IMAGE", mimeType: "image/png", maxBytes: 25 * 1024 * 1024 }],
  ["webp", { type: "IMAGE", mimeType: "image/webp", maxBytes: 25 * 1024 * 1024 }],
  ["gif", { type: "IMAGE", mimeType: "image/gif", maxBytes: 25 * 1024 * 1024 }],
  ["avif", { type: "IMAGE", mimeType: "image/avif", maxBytes: 25 * 1024 * 1024 }],
  ["mp4", { type: "VIDEO", mimeType: "video/mp4", maxBytes: 100 * 1024 * 1024 }],
  ["webm", { type: "VIDEO", mimeType: "video/webm", maxBytes: 100 * 1024 * 1024 }],
  ["mov", { type: "VIDEO", mimeType: "video/quicktime", maxBytes: 100 * 1024 * 1024 }],
  ["pdf", { type: "PDF", mimeType: "application/pdf", maxBytes: 25 * 1024 * 1024 }],
]);

async function validateShareRecipients(
  workspaceId: string,
  userIds: string[],
): Promise<boolean> {
  const unique = [...new Set(userIds)];
  if (unique.length !== userIds.length) return false;
  if (unique.length === 0) return true;
  const count = await db.workspaceMember.count({
    where: { workspaceId, userId: { in: unique } },
  });
  return count === unique.length;
}

function toDTO(asset: {
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
  createdAt: Date;
}): AssetDTO {
  return { ...asset, createdAt: asset.createdAt.toISOString() };
}

export async function createUploadSignatureAction(): Promise<
  ActionResult<UploadSignature>
> {
  const { userId, workspaceId } = await requireWorkspace();
  const limit = await rateLimit(
    opaqueRateLimitKey("cloudinary-signature", userId),
    30,
    60 * 60_000,
  );
  if (!limit.success) return fail("Upload limit reached. Try again later.");
  try {
    return ok(createUploadSignature(workspaceId));
  } catch (error) {
    console.error("[assets] signature failed", error);
    return fail("Could not prepare the upload. Check Cloudinary settings.");
  }
}

export async function saveAssetAction(
  input: SaveAssetInput
): Promise<ActionResult<AssetDTO>> {
  const { userId, workspaceId } = await requireWorkspace();

  const parsed = saveAssetSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Invalid upload payload", parsed.error.flatten().fieldErrors);
  }
  const data = parsed.data;

  // The record must reference a file this workspace actually uploaded.
  const { CLOUDINARY_CLOUD_NAME } = env();
  const expectedPrefix = `${workspaceFolder(workspaceId)}/`;
  const uploadId = data.publicId.slice(expectedPrefix.length);
  if (
    !data.publicId.startsWith(expectedPrefix) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      uploadId,
    )
  ) {
    return fail("Upload does not belong to this workspace");
  }
  const existingAsset = await db.asset.findUnique({
    where: { publicId: data.publicId },
    select: { id: true },
  });
  if (existingAsset) return fail("This upload has already been saved");

  const upload = await verifyUpload(data.publicId);
  const allowed = upload ? ALLOWED_FORMATS.get(upload.format) : undefined;
  if (
    !upload ||
    !allowed ||
    upload.bytes <= 0 ||
    upload.bytes > allowed.maxBytes ||
    !upload.url.startsWith(
      `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/`,
    )
  ) {
    await destroyUpload(data.publicId, ["image", "video", "raw"]);
    return fail("Uploaded file type or size is not allowed");
  }

  const sharedWithUserIds = data.sharedWithUserIds ?? [];
  if (
    !(await validateShareRecipients(workspaceId, sharedWithUserIds))
  ) {
    await destroyUpload(data.publicId, [upload.resourceType]);
    return fail("One or more sharing recipients are invalid");
  }

  if (data.campaignId) {
    const campaign = await db.campaign.findFirst({
      where: {
        id: data.campaignId,
        workspaceId,
        ...visibilityWhereClause(userId),
      },
      select: { id: true },
    });
    if (!campaign) return fail("Campaign not found");
  }

  const asset = await db.asset.create({
    data: {
      name: data.name,
      folder: data.folder || "/",
      type: allowed.type,
      mimeType: allowed.mimeType,
      size: upload.bytes,
      url: upload.url,
      publicId: data.publicId,
      width: upload.width ?? null,
      height: upload.height ?? null,
      format: upload.format,
      workspaceId,
      campaignId: data.campaignId ?? null,
      uploadedById: userId,
      visibility: data.visibility ?? "PUBLIC",
      sharedWithUserIds,
    },
  });

  await logActivity({
    workspaceId,
    userId,
    action: "UPLOADED",
    entityType: "ASSET",
    entityId: asset.id,
    title: `Uploaded ${asset.name}`,
    metadata: asset.campaignId ? { campaignId: asset.campaignId } : undefined,
  });

  revalidatePath("/assets");
  if (asset.campaignId) revalidatePath(`/campaigns/${asset.campaignId}`);

  return ok(toDTO(asset));
}

export async function deleteAssetAction(
  id: string
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const asset = await db.asset.findFirst({
    where: {
      id,
      workspaceId,
      ...managementWhereClause(userId, role, "uploadedById"),
    },
  });
  if (!asset) return fail("Asset not found");

  const candidates: ("image" | "video" | "raw")[] =
    asset.type === "VIDEO"
      ? ["video", "raw"]
      : asset.type === "IMAGE"
        ? ["image", "raw"]
        : ["image", "raw"];
  await destroyUpload(asset.publicId, candidates);

  await db.asset.delete({ where: { id } });

  await logActivity({
    workspaceId,
    userId,
    action: "DELETED",
    entityType: "ASSET",
    entityId: id,
    title: `Deleted ${asset.name}`,
  });

  revalidatePath("/assets");
  if (asset.campaignId) revalidatePath(`/campaigns/${asset.campaignId}`);
  return ok(undefined);
}
