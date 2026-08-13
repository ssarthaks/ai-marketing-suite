"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/server/db";
import { requireWorkspace } from "@/server/auth/session";
import { logActivity } from "@/server/activity";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  updateContentSchema,
  type UpdateContentInput,
} from "@/features/library/schemas/content.schema";
import {
  managementWhereClause,
  visibilityWhereClause,
} from "@/lib/visibility";
import type { WorkspaceRole } from "@prisma/client";

function revalidateContentPaths(id?: string) {
  revalidatePath("/library");
  revalidatePath("/ai-studio");
  if (id) revalidatePath(`/library/${id}`);
}

async function findVisibleContent(
  id: string,
  workspaceId: string,
  userId: string,
) {
  return db.contentGeneration.findFirst({
    where: { id, workspaceId, ...visibilityWhereClause(userId) },
  });
}

async function findManagedContent(
  id: string,
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
) {
  return db.contentGeneration.findFirst({
    where: {
      id,
      workspaceId,
      ...managementWhereClause(userId, role),
    },
  });
}

export async function toggleFavoriteAction(
  id: string
): Promise<ActionResult<{ isFavorite: boolean }>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const existing = await findManagedContent(id, workspaceId, userId, role);
  if (!existing) return fail("Content not found");

  const updated = await db.contentGeneration.update({
    where: { id },
    data: { isFavorite: !existing.isFavorite },
  });

  revalidateContentPaths(id);
  return ok({ isFavorite: updated.isFavorite });
}

export async function updateContentAction(
  id: string,
  input: UpdateContentInput
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const parsed = updateContentSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Invalid input", parsed.error.flatten().fieldErrors);
  }

  const existing = await findManagedContent(id, workspaceId, userId, role);
  if (!existing) return fail("Content not found");

  await db.contentGeneration.update({
    where: { id },
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      collection: parsed.data.collection || null,
    },
  });

  await logActivity({
    workspaceId,
    userId,
    action: "UPDATED",
    entityType: "CONTENT",
    entityId: id,
    title: `Edited “${parsed.data.title}”`,
    metadata: existing.campaignId
      ? { campaignId: existing.campaignId }
      : undefined,
  });

  revalidateContentPaths(id);
  return ok(undefined);
}

export async function duplicateContentAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const { userId, workspaceId } = await requireWorkspace();

  const existing = await findVisibleContent(id, workspaceId, userId);
  if (!existing) return fail("Content not found");

  const copy = await db.contentGeneration.create({
    data: {
      title: `${existing.title} (copy)`,
      type: existing.type,
      tone: existing.tone,
      audience: existing.audience,
      goal: existing.goal,
      prompt: existing.prompt,
      content: existing.content,
      model: existing.model,
      tokensUsed: existing.tokensUsed,
      collection: existing.collection,
      workspaceId,
      campaignId: existing.campaignId,
      createdById: userId,
    },
  });

  await logActivity({
    workspaceId,
    userId,
    action: "CREATED",
    entityType: "CONTENT",
    entityId: copy.id,
    title: `Duplicated “${existing.title}”`,
  });

  revalidateContentPaths();
  return ok({ id: copy.id });
}

export async function deleteContentAction(
  id: string,
  options?: { redirectToLibrary?: boolean }
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const existing = await findManagedContent(id, workspaceId, userId, role);
  if (!existing) return fail("Content not found");

  await db.contentGeneration.delete({ where: { id } });

  await logActivity({
    workspaceId,
    userId,
    action: "DELETED",
    entityType: "CONTENT",
    entityId: id,
    title: `Deleted “${existing.title}”`,
  });

  revalidateContentPaths(id);
  if (options?.redirectToLibrary) redirect("/library");
  return ok(undefined);
}
