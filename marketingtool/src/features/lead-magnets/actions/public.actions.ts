"use server";

import { db } from "@/server/db";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  magnetContentSchema,
  unlockMagnetSchema,
} from "@/features/lead-magnets/schemas/lead-magnet.schema";
import { rateLimit } from "@/lib/rate-limit";
import {
  clientAddress,
  opaqueRateLimitKey,
} from "@/lib/request-security";

export interface UnlockedMagnetContent {
  body: string;
  assetUrl: string | null;
  assetName: string | null;
}

/**
 * Public action — returns the gated content only after verifying that a
 * lead with this email exists for the magnet (i.e. the visitor actually
 * went through the capture form).
 */
export async function unlockLeadMagnetAction(input: {
  leadMagnetId: string;
  email: string;
}): Promise<ActionResult<UnlockedMagnetContent>> {
  const parsed = unlockMagnetSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request");
  const address = await clientAddress();
  const [combinedLimit, addressLimit, emailLimit] = await Promise.all([
    rateLimit(
      opaqueRateLimitKey(
        "unlock-magnet",
        address,
        parsed.data.leadMagnetId,
        parsed.data.email,
      ),
      10,
      15 * 60_000,
    ),
    rateLimit(
      opaqueRateLimitKey(
        "unlock-magnet-address",
        address,
        parsed.data.leadMagnetId,
      ),
      30,
      15 * 60_000,
    ),
    rateLimit(
      opaqueRateLimitKey(
        "unlock-magnet-email",
        parsed.data.leadMagnetId,
        parsed.data.email,
      ),
      10,
      15 * 60_000,
    ),
  ]);
  if (!combinedLimit.success || !addressLimit.success || !emailLimit.success) {
    return fail("Too many attempts. Please try again later.");
  }

  const magnet = await db.leadMagnet.findFirst({
    where: { id: parsed.data.leadMagnetId, status: "PUBLISHED" },
    include: { asset: { select: { url: true, name: true } } },
  });
  if (!magnet) return fail("This offer is no longer available");

  const lead = await db.lead.findFirst({
    where: {
      leadMagnetId: magnet.id,
      email: parsed.data.email,
    },
    select: { id: true },
  });
  if (!lead) return fail("Please submit your email first");

  const content = magnetContentSchema.safeParse(magnet.content);
  return ok({
    body: content.success ? content.data.body : "",
    assetUrl: magnet.asset?.url ?? null,
    assetName: magnet.asset?.name ?? null,
  });
}
