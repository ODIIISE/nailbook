import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyOwner } from "@/lib/owner-auth";

// PUT - upsert all addons (owner only)
export async function PUT(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { addons } = await request.json();

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
      console.error("Upsert addons error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Addons route error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
