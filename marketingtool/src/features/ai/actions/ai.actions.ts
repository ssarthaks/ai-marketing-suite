"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/server/db";
import { requireWorkspace } from "@/server/auth/session";
import {
  getProductDoc,
  resolveAccessibleProductKey,
} from "@/server/product-docs";
import { logActivity } from "@/server/activity";
import { AIError } from "@/server/ai/client";
import { deriveTitle, generateMarketingContent } from "@/server/ai/service";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  generateContentSchema,
  type GenerateContentInput,
} from "@/features/ai/schemas/generate.schema";
import type { GeneratedContentDTO } from "@/features/ai/types";
import { visibilityWhereClause } from "@/lib/visibility";

export async function generateContentAction(
  input: GenerateContentInput
): Promise<ActionResult<GeneratedContentDTO>> {
  const { userId, workspaceId, productKey } = await requireWorkspace();

  const parsed = generateContentSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Invalid input", parsed.error.flatten().fieldErrors);
  }
  const data = parsed.data;
  let accessibleProductKey: string | null;
  try {
    accessibleProductKey = await resolveAccessibleProductKey(
      userId,
      data.projectKey,
      productKey,
    );
  } catch {
    return fail("The selected product project is not available.");
  }
  const sharedWithUserIds = [...new Set(data.sharedWithUserIds || [])];
  if (sharedWithUserIds.length > 0) {
    const memberCount = await db.workspaceMember.count({
      where: { workspaceId, userId: { in: sharedWithUserIds } },
    });
    if (memberCount !== sharedWithUserIds.length) {
      return fail("One or more sharing recipients are not workspace members.");
    }
  }

  const [settings, campaign, productDoc] = await Promise.all([
    db.settings.findUnique({ where: { workspaceId } }),
    data.campaignId
      ? db.campaign.findFirst({
          where: {
            id: data.campaignId,
            workspaceId,
            ...visibilityWhereClause(userId),
          },
          select: {
            id: true,
            title: true,
            description: true,
            audience: true,
            product: true,
            objective: true,
          },
        })
      : Promise.resolve(null),
    getProductDoc(accessibleProductKey),
  ]);

  if (data.campaignId && !campaign) {
    return fail("Campaign not found");
  }

  const promptContext = {
    type: data.type,
    prompt: data.prompt,
    tone: data.tone,
    audience: data.audience || undefined,
    goal: data.goal || undefined,
    brand: settings,
    campaign,
    productDoc,
  };

  let generation;
  try {
    generation = await generateMarketingContent(promptContext);
  } catch (error) {
    if (error instanceof AIError) return fail(error.message);
    console.error("[ai] generation failed", error);
    return fail("Content generation failed. Please try again.");
  }

  const saved = await db.contentGeneration.create({
    data: {
      title: deriveTitle(promptContext),
      type: data.type,
      tone: data.tone,
      audience: data.audience || null,
      goal: data.goal || null,
      prompt: data.prompt,
      content: generation.content,
      collection: "AI_STUDIO",
      model: generation.model,
      tokensUsed: generation.tokensUsed,
      workspaceId,
      campaignId: campaign?.id ?? null,
      createdById: userId,
      visibility: data.visibility || "PUBLIC",
      sharedWithUserIds,
    },
  });

  await logActivity({
    workspaceId,
    userId,
    action: "GENERATED",
    entityType: "CONTENT",
    entityId: saved.id,
    title: `Generated “${saved.title}”`,
    metadata: campaign ? { campaignId: campaign.id } : undefined,
  });

  revalidatePath("/ai-studio");
  revalidatePath("/library");
  if (campaign) revalidatePath(`/campaigns/${campaign.id}`);

  return ok({
    id: saved.id,
    title: saved.title,
    type: saved.type,
    content: saved.content,
    tone: saved.tone,
    audience: saved.audience,
    goal: saved.goal,
    prompt: saved.prompt,
    campaignId: saved.campaignId,
    isFavorite: saved.isFavorite,
    tokensUsed: saved.tokensUsed,
    model: saved.model,
    createdAt: saved.createdAt.toISOString(),
  });
}
