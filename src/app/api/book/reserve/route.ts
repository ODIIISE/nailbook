import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// POST: Reserve a slot (lock it temporarily before final booking)
export async function POST(request: NextRequest) {
  try {
    const { service_id, date_gregorian, start_time, end_time } = await request.json();

    if (!service_id || !date_gregorian || !start_time || !end_time) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    // Check for existing booking in this slot
    const { data: conflicts } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("date_gregorian", date_gregorian)
      .eq("status", "confirmed")
      .lte("start_time", end_time)
      .gte("end_time", start_time);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ error: "این زمان قبلاً رزرو شده", conflict: true }, { status: 409 });
    }

    // Check blocked times
    const { data: blocked } = await supabaseAdmin
      .from("blocked_times")
      .select("id")
      .eq("date_gregorian", date_gregorian)
      .lte("start_time", end_time)
      .gte("end_time", start_time);

    if (blocked && blocked.length > 0) {
      return NextResponse.json({ error: "این زمان مسدود شده", conflict: true }, { status: 409 });
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    console.error("Reserve slot error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
