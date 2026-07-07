import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyOwner } from "@/lib/owner-auth";

// PUT - upsert all services (owner only)
export async function PUT(request: NextRequest) {
  console.log("[API /api/owner/services] PUT called");
  try {
    const owner = await verifyOwner(request);
    console.log("[API /api/owner/services] owner:", owner ? "authenticated" : "NOT authenticated");
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { services } = await request.json();
    console.log("[API /api/owner/services] received", services?.length, "services");

    if (!Array.isArray(services)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("services")
      .upsert(
        services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          duration_minutes: s.duration_minutes,
          price: s.price,
          is_active: s.is_active,
          sort_order: s.sort_order,
          addon_ids: s.addon_ids,
          priority_score: s.priority_score || 5,
        })),
        { onConflict: "id" }
      );

    if (error) {
      console.error("[API /api/owner/services] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[API /api/owner/services] success");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API /api/owner/services] route error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
