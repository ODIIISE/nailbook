import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// Simple in-memory rate limiter: max 30 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 30;
}

// POST: Check slot availability
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "درخواست زیاد است. لطفاً صبر کنید" }, { status: 429 });
    }

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
