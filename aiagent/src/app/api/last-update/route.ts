import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireActiveUser } from "@/lib/authz";

export async function GET() {
  try {
    await requireActiveUser();
    const res = await query(
      `SELECT MAX(updated_at) as last_update FROM markdown_files`,
    );
    const lastUpdate = res.rows[0]?.last_update || null;
    return NextResponse.json(
      { lastUpdate },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    const isAuthenticationError =
      error instanceof Error &&
      ["Unauthorized", "Password setup required"].includes(error.message);
    if (!isAuthenticationError) {
      console.error("Failed to fetch last update");
    }
    return NextResponse.json(
      { error: isAuthenticationError ? "Unauthorized" : "Request failed" },
      {
        status: isAuthenticationError ? 401 : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
