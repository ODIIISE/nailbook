import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyOwner } from "@/lib/owner-auth";

// GET - fetch all blocked times
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from("blocked_times")
      .select("date_gregorian, start_time, end_time")
      .order("date_gregorian", { ascending: true });

    if (error) return NextResponse.json({ error: "خطا" }, { status: 500 });
    return NextResponse.json({ blockedTimes: data || [] });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// PUT - replace all blocked times (owner only)
export async function PUT(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { blockedTimes } = await request.json();

    // Delete all existing
    await supabaseAdmin.from("blocked_times").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Insert new ones
    if (blockedTimes && blockedTimes.length > 0) {
      const { error } = await supabaseAdmin
        .from("blocked_times")
        .insert(blockedTimes.map((b: { date_gregorian: string; start_time: string; end_time: string }) => ({
          date_gregorian: b.date_gregorian,
          start_time: b.start_time,
          end_time: b.end_time,
        })));

      if (error) return NextResponse.json({ error: "خطا در ذخیره" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
