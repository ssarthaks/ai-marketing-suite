import { NextResponse } from "next/server";

import { resolveWorkspace } from "@/server/auth/session";
import { searchWorkspace } from "@/features/search/server/search.service";
import { rateLimit } from "@/lib/rate-limit";
import { opaqueRateLimitKey } from "@/lib/request-security";

export async function GET(request: Request) {
  const scope = await resolveWorkspace();
  const workspaceId = scope?.workspaceId;
  const userId = scope?.userId;
  if (!workspaceId || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) {
    return NextResponse.json({ results: [] });
  }

  const limit = await rateLimit(
    opaqueRateLimitKey("search", userId),
    60,
    60_000,
  );
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
  }

  const results = await searchWorkspace(workspaceId, userId, query);
  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
