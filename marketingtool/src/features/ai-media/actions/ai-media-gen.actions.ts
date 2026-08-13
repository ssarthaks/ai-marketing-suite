"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireWorkspace } from "@/server/auth/session";
import { logActivity } from "@/server/activity";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import type { AssetDTO } from "@/features/assets/types";

export interface SavePollinationsMediaInput {
  name: string;
  url: string;
  type: "IMAGE" | "VIDEO";
  width?: number;
  height?: number;
  format?: string;
  campaignId?: string;
}

export async function savePollinationsMediaAction(
  input: SavePollinationsMediaInput
): Promise<ActionResult<AssetDTO>> {
  const { userId, workspaceId } = await requireWorkspace();

  if (!input.name || !input.url) {
    return fail("Name and URL are required.");
  }

  const publicId = `pollinations-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const mimeType = input.type === "VIDEO" ? "video/mp4" : "image/png";
  const format = input.format || (input.type === "VIDEO" ? "mp4" : "png");

  try {
    const asset = await db.asset.create({
      data: {
        name: input.name,
        folder: "/AI Generations",
        type: input.type,
        mimeType,
        size: 1024 * 1024,
        url: input.url,
        publicId,
        width: input.width ?? (input.type === "VIDEO" ? 1280 : 1024),
        height: input.height ?? (input.type === "VIDEO" ? 720 : 1024),
        format,
        workspaceId,
        campaignId: input.campaignId || null,
        uploadedById: userId,
        visibility: "PUBLIC",
      },
    });

    await logActivity({
      workspaceId,
      userId,
      action: "GENERATED",
      entityType: "ASSET",
      entityId: asset.id,
      title: `Generated ${asset.name} via Pollinations.ai`,
    });

    revalidatePath("/assets");
    revalidatePath("/ai-media-gen");
    if (asset.campaignId) revalidatePath(`/campaigns/${asset.campaignId}`);

    return ok({
      ...asset,
      createdAt: asset.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("[ai-media-gen] Save asset failed:", error);
    return fail("Failed to save media asset to your workspace.");
  }
}
