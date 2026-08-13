import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ContentType } from "@prisma/client";

import { db } from "@/server/db";
import { logActivity } from "@/server/activity";
import { deriveTitle } from "@/server/ai/service";
import { rateLimit } from "@/lib/rate-limit";
import { clientAddress, opaqueRateLimitKey } from "@/lib/request-security";
import { visibilityWhereClause } from "@/lib/visibility";

const MAX_BODY_BYTES = 512 * 1024;

const syncGenerationSchema = z
  .object({
    type: z.nativeEnum(ContentType),
    prompt: z.string().trim().min(1).max(20_000),
    content: z.string().min(1).max(250_000),
    tone: z.string().trim().max(200).optional(),
    audience: z.string().trim().max(500).optional(),
    goal: z.string().trim().max(500).optional(),
    model: z.string().trim().max(100).optional(),
    tokensUsed: z.number().int().nonnegative().max(10_000_000).optional(),
    workspaceId: z.string().min(1).max(128),
    createdById: z.string().min(1).max(128),
    campaignId: z.string().min(1).max(128).optional(),
  })
  .strict();

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function secretMatches(provided: string | null, expected: string | undefined) {
  if (!provided || !expected || expected.length < 32) return false;
  const supplied = Buffer.from(provided, "utf8");
  const configured = Buffer.from(expected, "utf8");
  return (
    supplied.length === configured.length &&
    timingSafeEqual(supplied, configured)
  );
}

async function readBoundedBody(request: Request): Promise<string> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("PAYLOAD_TOO_LARGE");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  try {
    const address = await clientAddress();
    const authenticationLimit = await rateLimit(
      opaqueRateLimitKey("external-auth", address),
      60,
      60_000,
    );
    if (!authenticationLimit.success) {
      return json({ error: "Too many requests" }, 429);
    }

    if (
      !secretMatches(
        request.headers.get("x-api-secret"),
        process.env.EXTERNAL_API_SECRET,
      )
    ) {
      return json({ error: "Unauthorized" }, 401);
    }

    const limit = await rateLimit(
      opaqueRateLimitKey("external-generations", address),
      120,
      60_000,
    );
    if (!limit.success) return json({ error: "Too many requests" }, 429);

    const contentType =
      request.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.startsWith("application/json")) {
      return json({ error: "Content-Type must be application/json" }, 415);
    }

    let body: unknown;
    try {
      body = JSON.parse(await readBoundedBody(request));
    } catch (error) {
      if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") {
        return json({ error: "Payload too large" }, 413);
      }
      return json({ error: "Invalid JSON payload" }, 400);
    }
    const parsed = syncGenerationSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Invalid payload" }, 400);
    }
    const data = parsed.data;

    // Validate all foreign keys as one tenant-scoped relationship. Merely
    // existing globally is not sufficient.
    const membership = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: data.workspaceId,
          userId: data.createdById,
        },
      },
      select: { id: true },
    });
    if (!membership) return json({ error: "Workspace or user not found" }, 404);

    if (data.campaignId) {
      const campaign = await db.campaign.findFirst({
        where: {
          id: data.campaignId,
          workspaceId: data.workspaceId,
          ...visibilityWhereClause(data.createdById),
        },
        select: { id: true },
      });
      if (!campaign) return json({ error: "Campaign not found" }, 404);
    }

    const title = deriveTitle({
      type: data.type,
      prompt: data.prompt,
      tone: data.tone || "professional",
      audience: data.audience,
      goal: data.goal,
    });
    const saved = await db.contentGeneration.create({
      data: {
        title,
        type: data.type,
        tone: data.tone,
        audience: data.audience,
        goal: data.goal,
        prompt: data.prompt,
        content: data.content,
        model: data.model || "aiagent",
        tokensUsed: data.tokensUsed,
        workspaceId: data.workspaceId,
        createdById: data.createdById,
        campaignId: data.campaignId,
      },
      select: { id: true, title: true },
    });

    await logActivity({
      workspaceId: data.workspaceId,
      userId: data.createdById,
      action: "GENERATED",
      entityType: "CONTENT",
      entityId: saved.id,
      title: `Saved “${saved.title}” via AI Agent`,
      metadata: data.campaignId ? { campaignId: data.campaignId } : undefined,
    });

    return json({ success: true, data: saved }, 201);
  } catch (error) {
    console.error(
      "[external/generations] request failed:",
      error instanceof Error ? error.name : "Unknown error",
    );
    return json({ error: "Internal server error" }, 500);
  }
}
