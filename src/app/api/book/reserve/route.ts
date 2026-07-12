import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

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

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "درخواست زیاد است" }, { status: 429 });
    }

    const { service_id, date_gregorian, start_time, end_time } = await request.json();

    if (!service_id || !date_gregorian || !start_time || !end_time) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const { rows: conflicts } = await sql`
      SELECT id FROM bookings
      WHERE date_gregorian = ${date_gregorian}::date
      AND status = 'confirmed'
      AND start_time < ${end_time}
      AND end_time > ${start_time}
    `;

    if (conflicts.length > 0) {
      return NextResponse.json({ error: "این زمان قبلاً رزرو شده", conflict: true }, { status: 409 });
    }

    const { rows: blocked } = await sql`
      SELECT id FROM blocked_times
      WHERE date_gregorian = ${date_gregorian}::date
      AND start_time < ${end_time}
      AND end_time > ${start_time}
    `;

    if (blocked.length > 0) {
      return NextResponse.json({ error: "این زمان مسدود شده", conflict: true }, { status: 409 });
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
