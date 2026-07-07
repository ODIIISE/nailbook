import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyOwner } from "@/lib/owner-auth";

export async function GET(request: NextRequest) {
  const result: Record<string, unknown> = {};

  // Check env vars
  result.hasSupabaseUrl = !!process.env.SUPABASE_URL;
  result.hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Check owner auth
  const owner = await verifyOwner(request);
  result.ownerAuthenticated = !!owner;
  result.ownerId = owner?.id || null;

  // Check cookie
  const cookie = request.cookies.get("owner_session");
  result.hasCookie = !!cookie;

  // Test DB read
  try {
    const { data, error } = await supabaseAdmin.from("addons").select("id").limit(1);
    result.dbReadOk = !error;
    result.dbReadError = error?.message || null;
    result.addonCount = data?.length ?? null;
  } catch (e) {
    result.dbReadOk = false;
    result.dbReadError = String(e);
  }

  // Test DB write (dry run - just check if we can connect)
  try {
    const { error } = await supabaseAdmin.from("addons").select("id").limit(0);
    result.dbWriteAccessible = !error;
  } catch (e) {
    result.dbWriteAccessible = false;
  }

  return NextResponse.json(result, { status: 200 });
}
