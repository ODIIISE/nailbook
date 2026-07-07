import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyOwner } from "@/lib/owner-auth";

export async function PUT(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const { services } = await request.json();

    if (!Array.isArray(services)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Validate fields
    for (const s of services) {
      if (!s.name || typeof s.name !== "string") {
        return NextResponse.json({ error: "نام خدمت الزامی است" }, { status: 400 });
      }
      if (typeof s.price !== "number" || s.price < 0) {
        return NextResponse.json({ error: "قیمت نامعتبر است" }, { status: 400 });
      }
      if (typeof s.duration_minutes !== "number" || s.duration_minutes <= 0) {
        return NextResponse.json({ error: "مدت زمان نامعتبر است" }, { status: 400 });
      }
    }

    // Delete all existing services, then insert the new list
    // This ensures deletions are persisted
    await supabaseAdmin.from("services").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    if (services.length > 0) {
      const { error } = await supabaseAdmin
        .from("services")
        .insert(
          services.map((s, i) => ({
            id: s.id,
            name: s.name,
            description: s.description || "",
            duration_minutes: s.duration_minutes,
            price: s.price,
            is_active: s.is_active !== false,
            sort_order: s.sort_order || i + 1,
            addon_ids: s.addon_ids || [],
            priority_score: s.priority_score || 5,
          }))
        );

      if (error) {
        console.error("Insert services error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Services route error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
