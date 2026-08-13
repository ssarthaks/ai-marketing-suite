"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/server/db";
import { requireWorkspace } from "@/server/auth/session";
import { logActivity } from "@/server/activity";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { uniqueSlug } from "@/lib/slugify";
import {
  leadMagnetFormSchema,
  type LeadMagnetFormInput,
} from "@/features/lead-magnets/schemas/lead-magnet.schema";
import {
  managementWhereClause,
  visibilityWhereClause,
} from "@/lib/visibility";
import type { WorkspaceRole } from "@prisma/client";
import { z } from "zod";

function revalidateMagnet(id: string, slug?: string) {
  revalidatePath("/lead-magnets");
  revalidatePath(`/lead-magnets/${id}`);
  if (slug) revalidatePath(`/m/${slug}`);
}

async function validateRelations(
  workspaceId: string,
  userId: string,
  data: LeadMagnetFormInput
): Promise<string | null> {
  if (data.campaignId) {
    const campaign = await db.campaign.findFirst({
      where: {
        id: data.campaignId,
        workspaceId,
        ...visibilityWhereClause(userId),
      },
      select: { id: true },
    });
    if (!campaign) return "Campaign not found";
  }
  if (data.assetId) {
    const asset = await db.asset.findFirst({
      where: {
        id: data.assetId,
        workspaceId,
        ...visibilityWhereClause(userId, "uploadedById"),
      },
      select: { id: true },
    });
    if (!asset) return "Attached file not found";
  }
  const sharedWithUserIds = data.sharedWithUserIds || [];
  if (new Set(sharedWithUserIds).size !== sharedWithUserIds.length) {
    return "Sharing recipients must be unique";
  }
  if (sharedWithUserIds.length > 0) {
    const count = await db.workspaceMember.count({
      where: { workspaceId, userId: { in: sharedWithUserIds } },
    });
    if (count !== sharedWithUserIds.length) {
      return "One or more sharing recipients are not workspace members";
    }
  }
  return null;
}

async function findManagedMagnet(
  id: string,
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
) {
  return db.leadMagnet.findFirst({
    where: {
      id,
      workspaceId,
      ...managementWhereClause(userId, role),
    },
    select: { id: true, title: true, slug: true },
  });
}

export async function createLeadMagnetAction(
  input: LeadMagnetFormInput
): Promise<ActionResult<void>> {
  const { userId, workspaceId } = await requireWorkspace();

  const parsed = leadMagnetFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Invalid input", parsed.error.flatten().fieldErrors);
  }
  const relationError = await validateRelations(
    workspaceId,
    userId,
    parsed.data,
  );
  if (relationError) return fail(relationError);

  const magnet = await db.leadMagnet.create({
    data: {
      title: parsed.data.title,
      slug: uniqueSlug(parsed.data.title),
      type: parsed.data.type,
      description: parsed.data.description || null,
      content: { body: parsed.data.body },
      assetId: parsed.data.assetId ?? null,
      campaignId: parsed.data.campaignId ?? null,
      workspaceId,
      createdById: userId,
      visibility: parsed.data.visibility || "PUBLIC",
      sharedWithUserIds: parsed.data.sharedWithUserIds || [],
    },
  });

  await logActivity({
    workspaceId,
    userId,
    action: "CREATED",
    entityType: "LEAD_MAGNET",
    entityId: magnet.id,
    title: `Created lead magnet “${magnet.title}”`,
    metadata: magnet.campaignId ? { campaignId: magnet.campaignId } : undefined,
  });

  revalidatePath("/lead-magnets");
  redirect(`/lead-magnets/${magnet.id}`);
}

export async function updateLeadMagnetAction(
  id: string,
  input: LeadMagnetFormInput
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const parsed = leadMagnetFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Invalid input", parsed.error.flatten().fieldErrors);
  }

  const existing = await findManagedMagnet(id, workspaceId, userId, role);
  if (!existing) return fail("Lead magnet not found");

  const relationError = await validateRelations(
    workspaceId,
    userId,
    parsed.data,
  );
  if (relationError) return fail(relationError);

  await db.leadMagnet.update({
    where: { id },
    data: {
      title: parsed.data.title,
      type: parsed.data.type,
      description: parsed.data.description || null,
      content: { body: parsed.data.body },
      assetId: parsed.data.assetId ?? null,
      campaignId: parsed.data.campaignId ?? null,
      visibility: parsed.data.visibility || "PUBLIC",
      sharedWithUserIds: parsed.data.sharedWithUserIds || [],
    },
  });

  await logActivity({
    workspaceId,
    userId,
    action: "UPDATED",
    entityType: "LEAD_MAGNET",
    entityId: id,
    title: `Updated lead magnet “${parsed.data.title}”`,
  });

  revalidateMagnet(id, existing.slug);
  return ok(undefined);
}

export async function updateLeadMagnetStatusAction(
  id: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const parsedStatus = z
    .enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
    .safeParse(status);
  if (!parsedStatus.success) return fail("Invalid status");

  const existing = await findManagedMagnet(id, workspaceId, userId, role);
  if (!existing) return fail("Lead magnet not found");

  await db.leadMagnet.update({
    where: { id },
    data: {
      status: parsedStatus.data,
      publishedAt:
        parsedStatus.data === "PUBLISHED" ? new Date() : undefined,
    },
  });

  await logActivity({
    workspaceId,
    userId,
    action: parsedStatus.data === "PUBLISHED" ? "PUBLISHED" : "UPDATED",
    entityType: "LEAD_MAGNET",
    entityId: id,
    title: `Moved lead magnet “${existing.title}” to ${parsedStatus.data.toLowerCase()}`,
  });

  revalidateMagnet(id, existing.slug);
  return ok(undefined);
}

export async function setLeadMagnetPublishedAction(
  id: string,
  publish: boolean
): Promise<ActionResult<{ status: "PUBLISHED" | "DRAFT" }>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const existing = await findManagedMagnet(id, workspaceId, userId, role);
  if (!existing) return fail("Lead magnet not found");

  const status = publish ? "PUBLISHED" : "DRAFT";
  await db.leadMagnet.update({
    where: { id },
    data: { status, publishedAt: publish ? new Date() : null },
  });

  await logActivity({
    workspaceId,
    userId,
    action: publish ? "PUBLISHED" : "UNPUBLISHED",
    entityType: "LEAD_MAGNET",
    entityId: id,
    title: `${publish ? "Published" : "Unpublished"} “${existing.title}”`,
  });

  revalidateMagnet(id, existing.slug);
  return ok({ status });
}

export async function deleteLeadMagnetAction(
  id: string
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const existing = await findManagedMagnet(id, workspaceId, userId, role);
  if (!existing) return fail("Lead magnet not found");

  await db.leadMagnet.delete({ where: { id } });

  await logActivity({
    workspaceId,
    userId,
    action: "DELETED",
    entityType: "LEAD_MAGNET",
    entityId: id,
    title: `Deleted lead magnet “${existing.title}”`,
  });

  revalidatePath("/lead-magnets");
  revalidatePath(`/m/${existing.slug}`);
  redirect("/lead-magnets");
}
