"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CampaignStatus } from "@prisma/client";
import { z } from "zod";

import { db } from "@/server/db";
import { requireWorkspace } from "@/server/auth/session";
import { logActivity } from "@/server/activity";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  campaignFormSchema,
  campaignNotesSchema,
  type CampaignFormInput,
  type CampaignNotesInput,
} from "@/features/campaigns/schemas/campaign.schema";
import { managementWhereClause } from "@/lib/visibility";
import type { WorkspaceRole } from "@prisma/client";

function toData(input: CampaignFormInput) {
  return {
    title: input.title,
    description: input.description || null,
    audience: input.audience || null,
    product: input.product || null,
    objective: input.objective || null,
    budget: input.budget === "" ? null : input.budget,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    status: input.status,
    visibility: input.visibility,
    sharedWithUserIds: input.sharedWithUserIds || [],
  };
}

async function findManagedCampaign(
  id: string,
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
) {
  return db.campaign.findFirst({
    where: {
      id,
      workspaceId,
      ...managementWhereClause(userId, role),
    },
    select: { id: true, title: true },
  });
}

async function validShareRecipients(workspaceId: string, userIds: string[]) {
  const unique = [...new Set(userIds)];
  if (unique.length !== userIds.length) return false;
  if (unique.length === 0) return true;
  const count = await db.workspaceMember.count({
    where: { workspaceId, userId: { in: unique } },
  });
  return count === unique.length;
}

export async function createCampaignAction(
  input: CampaignFormInput
): Promise<ActionResult<{ id: string }>> {
  const { userId, workspaceId } = await requireWorkspace();

  const parsed = campaignFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Invalid input", parsed.error.flatten().fieldErrors);
  }

  let targetWorkspaceId = workspaceId;

  // If currently in a personal workspace, they MUST select a product key
  const currentWorkspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!currentWorkspace?.productKey) {
    if (!parsed.data.selectedProductKey) {
      return fail("You must select a project to create a campaign.");
    }
    const targetWorkspace = await db.workspace.findFirst({
      where: {
        productKey: parsed.data.selectedProductKey,
        members: { some: { userId } },
      }
    });
    if (!targetWorkspace) {
      return fail("Selected project workspace not found or you don't have access.");
    }
    targetWorkspaceId = targetWorkspace.id;
  }
  if (
    !(await validShareRecipients(
      targetWorkspaceId,
      parsed.data.sharedWithUserIds,
    ))
  ) {
    return fail("One or more sharing recipients are not project members.");
  }

  const campaign = await db.campaign.create({
    data: {
      ...toData(parsed.data),
      workspaceId: targetWorkspaceId,
      createdById: userId,
    },
  });

  await logActivity({
    workspaceId: targetWorkspaceId,
    userId,
    action: "CREATED",
    entityType: "CAMPAIGN",
    entityId: campaign.id,
    title: `Created campaign “${campaign.title}”`,
  });

  revalidatePath("/campaigns");
  redirect(`/campaigns/${campaign.id}`);
}

export async function updateCampaignAction(
  id: string,
  input: CampaignFormInput
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const parsed = campaignFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Invalid input", parsed.error.flatten().fieldErrors);
  }

  const existing = await findManagedCampaign(id, workspaceId, userId, role);
  if (!existing) return fail("Campaign not found");
  if (
    !(await validShareRecipients(
      workspaceId,
      parsed.data.sharedWithUserIds,
    ))
  ) {
    return fail("One or more sharing recipients are not workspace members.");
  }

  await db.campaign.update({
    where: { id },
    data: toData(parsed.data),
  });

  await logActivity({
    workspaceId,
    userId,
    action: "UPDATED",
    entityType: "CAMPAIGN",
    entityId: id,
    title: `Updated campaign “${parsed.data.title}”`,
  });

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  redirect(`/campaigns/${id}`);
}

export async function updateCampaignStatusAction(
  id: string,
  status: CampaignStatus
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const parsed = z.enum(CampaignStatus).safeParse(status);
  if (!parsed.success) return fail("Invalid status");

  const existing = await findManagedCampaign(id, workspaceId, userId, role);
  if (!existing) return fail("Campaign not found");

  await db.campaign.update({ where: { id }, data: { status: parsed.data } });

  await logActivity({
    workspaceId,
    userId,
    action: "UPDATED",
    entityType: "CAMPAIGN",
    entityId: id,
    title: `Moved “${existing.title}” to ${parsed.data.toLowerCase()}`,
  });

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  return ok(undefined);
}

export async function updateCampaignNotesAction(
  id: string,
  input: CampaignNotesInput
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const parsed = campaignNotesSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Invalid input", parsed.error.flatten().fieldErrors);
  }

  const existing = await findManagedCampaign(id, workspaceId, userId, role);
  if (!existing) return fail("Campaign not found");

  await db.campaign.update({
    where: { id },
    data: { notes: parsed.data.notes || null },
  });

  revalidatePath(`/campaigns/${id}`);
  return ok(undefined);
}

export async function deleteCampaignAction(
  id: string
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const existing = await findManagedCampaign(id, workspaceId, userId, role);
  if (!existing) return fail("Campaign not found");

  await db.campaign.delete({ where: { id } });

  await logActivity({
    workspaceId,
    userId,
    action: "DELETED",
    entityType: "CAMPAIGN",
    entityId: id,
    title: `Deleted campaign “${existing.title}”`,
  });

  revalidatePath("/campaigns");
  redirect("/campaigns");
}
