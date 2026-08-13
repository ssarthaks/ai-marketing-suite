"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/server/db";
import { requireWorkspace } from "@/server/auth/session";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  brandProfileSchema,
  type BrandProfileInput,
} from "@/features/settings/schemas/settings.schema";
import { isWorkspaceManager } from "@/lib/visibility";

function normalize(input: BrandProfileInput) {
  return {
    brandName: input.brandName || null,
    website: input.website || null,
    industry: input.industry || null,
    brandDescription: input.brandDescription || null,
    brandVoice: input.brandVoice || null,
    defaultTone: input.defaultTone,
  };
}

export async function updateBrandSettingsAction(
  input: BrandProfileInput
): Promise<ActionResult<void>> {
  const { workspaceId, role } = await requireWorkspace();
  if (!isWorkspaceManager(role)) {
    return fail("Only workspace owners and administrators can update settings");
  }

  const parsed = brandProfileSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Invalid input", parsed.error.flatten().fieldErrors);
  }

  await db.settings.upsert({
    where: { workspaceId },
    update: normalize(parsed.data),
    create: { workspaceId, ...normalize(parsed.data) },
  });

  revalidatePath("/settings");
  return ok(undefined);
}

export async function completeOnboardingAction(
  input: BrandProfileInput
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();
  if (!isWorkspaceManager(role)) {
    return fail("Only workspace owners and administrators can update settings");
  }

  const parsed = brandProfileSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Invalid input", parsed.error.flatten().fieldErrors);
  }

  await db.$transaction([
    db.settings.upsert({
      where: { workspaceId },
      update: normalize(parsed.data),
      create: { workspaceId, ...normalize(parsed.data) },
    }),
    db.user.update({
      where: { id: userId },
      data: { onboardedAt: new Date() },
    }),
  ]);

  redirect(`/${workspaceId}/dashboard`);
}

export async function skipOnboardingAction(): Promise<void> {
  const { userId, workspaceId } = await requireWorkspace();
  await db.user.update({
    where: { id: userId },
    data: { onboardedAt: new Date() },
  });
  redirect(`/${workspaceId}/dashboard`);
}
