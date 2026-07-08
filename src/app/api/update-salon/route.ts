import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyOwner } from "@/lib/owner-auth";

const ALLOWED_FIELDS = [
  "name", "description", "slogan", "phone", "address",
  "hero_image_url", "logo_url", "working_hours_text",
  "working_hours", "specific_days_off",
  "slot_buffer_minutes", "slot_interval_minutes",
];

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const updates = await request.json();

    // Whitelist allowed fields to prevent mass assignment
    const safeUpdates: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      if (ALLOWED_FIELDS.includes(key)) {
        safeUpdates[key] = updates[key];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("salon_info")
      .select("id")
      .limit(1)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("salon_info")
      .update(safeUpdates)
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
