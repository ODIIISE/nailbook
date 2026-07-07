import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyOwner } from "@/lib/owner-auth";

// PUT - upsert all addons (owner only)
export async function PUT(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      console.log("[API addons] Owner not authenticated");
      return NextResponse.json({ error: "غیرمجاز - لطفاً دوباره وارد شوید", debug: "owner_auth_failed" }, { status: 401 });
    }

    const { addons } = await request.json();

    if (!Array.isArray(addons)) {
      return NextResponse.json({ error: "Invalid data", debug: "not_array" }, { status: 400 });
    }

    const rows = addons.map((a) => ({
      id: a.id,
      name: a.name,
      price: a.price,
      duration_minutes: a.duration_minutes,
      is_active: a.is_active,
    }));

    const { data, error } = await supabaseAdmin
      .from("addons")
      .upsert(rows, { onConflict: "id" })
      .select();

    if (error) {
      console.error("[API addons] Supabase error:", JSON.stringify(error));
      return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data?.length || 0 });
  } catch (error) {
    console.error("[API addons] route error:", error);
    return NextResponse.json({ error: "خطای سرور", debug: String(error) }, { status: 500 });
  }
}
