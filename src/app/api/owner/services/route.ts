import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyOwner } from "@/lib/owner-auth";

// PUT - upsert all services (owner only)
export async function PUT(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      console.log("[API services] Owner not authenticated");
      return NextResponse.json({ error: "غیرمجاز - لطفاً دوباره وارد شوید", debug: "owner_auth_failed" }, { status: 401 });
    }

    const { services } = await request.json();

    if (!Array.isArray(services)) {
      return NextResponse.json({ error: "Invalid data", debug: "not_array" }, { status: 400 });
    }

    const rows = services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      duration_minutes: s.duration_minutes,
      price: s.price,
      is_active: s.is_active,
      sort_order: s.sort_order,
      addon_ids: s.addon_ids,
      priority_score: s.priority_score || 5,
    }));

    const { data, error } = await supabaseAdmin
      .from("services")
      .upsert(rows, { onConflict: "id" })
      .select();

    if (error) {
      console.error("[API services] Supabase error:", JSON.stringify(error));
      return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data?.length || 0 });
  } catch (error) {
    console.error("[API services] route error:", error);
    return NextResponse.json({ error: "خطای سرور", debug: String(error) }, { status: 500 });
  }
}
