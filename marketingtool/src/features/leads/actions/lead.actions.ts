"use server";

import { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { logActivity } from "@/server/activity";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  publicLeadSchema,
  type PublicLeadInput,
} from "@/features/leads/schemas/lead.schema";
import { rateLimit } from "@/lib/rate-limit";
import {
  clientAddress,
  opaqueRateLimitKey,
} from "@/lib/request-security";

/**
 * Public action — invoked from published landing pages and lead magnet
 * pages without authentication. Resolves the workspace from the target
 * entity, never from a session.
 */
export async function capturePublicLeadAction(
  input: PublicLeadInput
): Promise<ActionResult<void>> {
  const parsed = publicLeadSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please enter a valid email", parsed.error.flatten().fieldErrors);
  }
  const data = parsed.data;
  const address = await clientAddress();
  const sourceId = data.landingPageId || data.leadMagnetId || "invalid";
  const [combinedLimit, sourceAddressLimit, sourceEmailLimit] =
    await Promise.all([
      rateLimit(
        opaqueRateLimitKey("public-lead", address, sourceId, data.email),
        8,
        60 * 60_000,
      ),
      rateLimit(
        opaqueRateLimitKey("public-lead-address", address, sourceId),
        30,
        60 * 60_000,
      ),
      rateLimit(
        opaqueRateLimitKey("public-lead-email", sourceId, data.email),
        5,
        60 * 60_000,
      ),
    ]);
  if (
    !combinedLimit.success ||
    !sourceAddressLimit.success ||
    !sourceEmailLimit.success
  ) {
    return fail("Too many submissions. Please try again later.");
  }

  let workspaceId: string | null = null;
  let source = "direct";
  let sourceTitle = "";

  if (data.landingPageId) {
    const page = await db.landingPage.findFirst({
      where: { id: data.landingPageId, status: "PUBLISHED" },
      select: { id: true, workspaceId: true, title: true },
    });
    if (!page) return fail("This page is no longer accepting signups");
    workspaceId = page.workspaceId;
    source = "landing-page";
    sourceTitle = page.title;
  } else if (data.leadMagnetId) {
    const magnet = await db.leadMagnet.findFirst({
      where: { id: data.leadMagnetId, status: "PUBLISHED" },
      select: { id: true, workspaceId: true, title: true },
    });
    if (!magnet) return fail("This offer is no longer available");
    workspaceId = magnet.workspaceId;
    source = "lead-magnet";
    sourceTitle = magnet.title;
  }

  if (!workspaceId) return fail("Invalid capture source");

  // Idempotent per source: don't store the same email twice for one target.
  const existing = await db.lead.findFirst({
    where: {
      workspaceId,
      email: data.email,
      landingPageId: data.landingPageId ?? null,
      leadMagnetId: data.leadMagnetId ?? null,
    },
    select: { id: true },
  });
  if (existing) return ok(undefined);

  try {
    await db.lead.create({
      data: {
        email: data.email,
        name: data.name || null,
        source,
        workspaceId,
        landingPageId: data.landingPageId ?? null,
        leadMagnetId: data.leadMagnetId ?? null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return ok(undefined);
    }
    throw error;
  }

  await logActivity({
    workspaceId,
    action: "CAPTURED",
    entityType: "LEAD",
    title: `New lead via ${sourceTitle}`,
  });

  return ok(undefined);
}
