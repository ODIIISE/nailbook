import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

export async function GET(request: NextRequest) {
  const result: Record<string, unknown> = {};

  result.hasPostgresUrl = !!process.env.POSTGRES_URL;
  const owner = await verifyOwner(request);
  result.ownerAuthenticated = !!owner;
  result.ownerId = owner?.id || null;
  const cookie = request.cookies.get("owner_session");
  result.hasCookie = !!cookie;

  try {
    const { rows } = await sql`SELECT id FROM addons LIMIT 1`;
    result.dbReadOk = true;
    result.addonCount = rows.length;
  } catch (e) {
    result.dbReadOk = false;
    result.dbReadError = String(e);
  }

  return NextResponse.json(result, { status: 200 });
}
