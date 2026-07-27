import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { sendOtp } from "@/lib/otp-service";
import { normalizeDigits, isValidIranianPhone } from "@/lib/digits";

// IP-based rate limiting for OTP requests (in-memory, per-process)
const ipAttempts = new Map<string, { count: number; resetAt: number }>();
const IP_LIMIT = 10;
const IP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipAttempts.get(ip);
  if (!record || now > record.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return true;
  }
  if (record.count >= IP_LIMIT) return false;
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const { phone, roleContext = "customer" } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: "شماره الزامی است" }, { status: 400 });
    }

    const normalized = normalizeDigits(String(phone).trim());
    if (!isValidIranianPhone(normalized)) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    if (!checkIpRateLimit(ip)) {
      return NextResponse.json({ error: "تعداد تلاش‌ها بیش از حد مجاز است" }, { status: 429 });
    }

    // If this is an owner login context, do not send OTP to non-owners.
    // To prevent enumeration, still return success for non-owners but do not persist/send.
    if (roleContext === "owner") {
      const { rows } = await sql`SELECT id FROM users WHERE phone = ${normalized} AND role = 'owner' LIMIT 1`;
      if (rows.length === 0) {
        return NextResponse.json({ success: true });
      }
    }

    const result = await sendOtp(normalized);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("send-otp error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
