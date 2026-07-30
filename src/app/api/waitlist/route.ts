import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// In-memory per-IP rate limiter for waitlist spam protection.
const waitlistAttempts = new Map<string, { count: number; windowStart: number }>();
const MAX_WAITLIST_PER_WINDOW = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkWaitlistRate(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = waitlistAttempts.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    waitlistAttempts.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (entry.count >= MAX_WAITLIST_PER_WINDOW) {
    return { allowed: false, retryAfter: Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000) };
  }
  entry.count += 1;
  return { allowed: true };
}

/**
 * POST /api/waitlist — Join the waitlist for a fully-booked day.
 * Body: { date_gregorian: string, customer_name: string, customer_phone: string, notification_method?: "sms" | "whatsapp" }
 */
export async function POST(request: NextRequest) {
  try {
    const { date_gregorian, customer_name, customer_phone, notification_method } = await request.json();

    if (!date_gregorian || !customer_phone) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    // Rate-limit by IP to prevent spam (no auth on this public endpoint).
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const gate = checkWaitlistRate(ip);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: "تعداد درخواست‌ها بیش از حد مجاز" },
        { status: 429 }
      );
    }

    // Upsert: if already on waitlist for this day, return success (idempotent)
    const { rows } = await sql`
      INSERT INTO waitlist (date_gregorian, customer_name, customer_phone, notification_method)
      VALUES (${date_gregorian}::date, ${customer_name || ""}, ${customer_phone}, ${notification_method || "sms"})
      ON CONFLICT (customer_phone, date_gregorian) DO UPDATE SET
        customer_name = EXCLUDED.customer_name,
        notification_method = EXCLUDED.notification_method
      RETURNING id
    `;

    return NextResponse.json({ success: true, id: rows[0].id });
  } catch (error) {
    console.error("Waitlist join error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
