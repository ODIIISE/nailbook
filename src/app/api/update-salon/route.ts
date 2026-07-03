import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const updates = await request.json();

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
      .update(updates)
      .eq("id", existing.id);

    if (error) {
      console.error("Update salon error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update salon route error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
