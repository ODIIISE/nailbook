import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyOwner } from "@/lib/owner-auth";

export async function PUT(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const { addons } = await request.json();

    if (!Array.isArray(addons)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Validate fields
    for (const a of addons) {
      if (!a.name || typeof a.name !== "string") {
        return NextResponse.json({ error: "نام آپشن الزامی است" }, { status: 400 });
      }
      if (typeof a.price !== "number" || a.price < 0) {
        return NextResponse.json({ error: "قیمت نامعتبر است" }, { status: 400 });
      }
      if (typeof a.duration_minutes !== "number" || a.duration_minutes <= 0) {
        return NextResponse.json({ error: "مدت زمان نامعتبر است" }, { status: 400 });
      }
    }

    // Delete all existing addons, then insert the new list
    // This ensures deletions are persisted
    await supabaseAdmin.from("addons").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    if (addons.length > 0) {
      const { error } = await supabaseAdmin
        .from("addons")
        .insert(
          addons.map((a, i) => ({
            id: a.id,
            name: a.name,
            price: a.price,
            duration_minutes: a.duration_minutes,
            is_active: a.is_active !== false,
            sort_order: a.sort_order || i + 1,
          }))
        );

      if (error) {
        console.error("Insert addons error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Addons route error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
