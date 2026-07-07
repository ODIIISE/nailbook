import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyOwner } from "@/lib/owner-auth";

// PUT - upsert all addons (owner only)
export async function PUT(request: NextRequest) {
  console.log("[API /api/owner/addons] PUT called");
  try {
    const owner = await verifyOwner(request);
    console.log("[API /api/owner/addons] owner:", owner ? "authenticated" : "NOT authenticated");
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { addons } = await request.json();
    console.log("[API /api/owner/addons] received", addons?.length, "addons");

    if (!Array.isArray(addons)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("addons")
      .upsert(
        addons.map((a) => ({
          id: a.id,
          name: a.name,
          price: a.price,
          duration_minutes: a.duration_minutes,
          is_active: a.is_active,
        })),
        { onConflict: "id" }
      );

    if (error) {
      console.error("[API /api/owner/addons] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[API /api/owner/addons] success");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API /api/owner/addons] route error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
