import { NextRequest, NextResponse } from "next/server";
import { sendOtp } from "@/lib/otp-service";
import { normalizeDigits, isValidIranianPhone } from "@/lib/digits";

// In-memory per-IP+phone rate limiter for SMS-bomb protection.
// Resets on every cold start (serverless) — a 15-min window keeps the attack
// window short and the SMS spend bounded.
const otpAttempts = new Map<string, { count: number; windowStart: number }>();
const MAX_OTP_PER_WINDOW = 3;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_MAP_SIZE = 5000; // hard cap; sweep when exceeded

function rateKey(ip: string, phone: string): string {
  return `${ip}:${phone}`;
}

// Best-effort opportunistic sweep so the Map doesn't grow unbounded across
// high-volume abuse windows. Runs on the first request after the cap.
let lastSweepAt = 0;
function sweepIfStale(now: number) {
  if (now - lastSweepAt < WINDOW_MS) return;
  if (otpAttempts.size < MAX_MAP_SIZE) return;
  lastSweepAt = now;
  for (const [k, v] of otpAttempts) {
    if (now - v.windowStart > WINDOW_MS) otpAttempts.delete(k);
  }
}

function checkOtpRateLimit(ip: string, phone: string): { allowed: boolean; retryAfter?: number } {
  const key = rateKey(ip, phone);
  const now = Date.now();
  sweepIfStale(now);
  const entry = otpAttempts.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    otpAttempts.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (entry.count >= MAX_OTP_PER_WINDOW) {
    return {
      allowed: false,
      retryAfter: Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000),
    };
  }
  entry.count += 1;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: "شماره الزامی است" }, { status: 400 });
    }

    const normalized = normalizeDigits(String(phone).trim());
    if (!isValidIranianPhone(normalized)) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }

    // Per-IP+phone throttle before any work to block SMS-bomb abuse.
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const gate = checkOtpRateLimit(ip, normalized);
    if (!gate.allowed) {
      return NextResponse.json(
        {
          error: `تعداد درخواست‌ها بیش از حد مجاز. ${Math.max(1, Math.ceil((gate.retryAfter || 0) / 60))} دقیقه دیگر تلاش کنید.`,
        },
        { status: 429 }
      );
    }

    // Help diagnose provider configuration in production without exposing secrets.
    console.log("[send-otp] config check:", {
      provider: process.env.SMS_PROVIDER || "default (farazsms)",
      farazsmsApiKeySet: Boolean(process.env.FARAZSMS_API_KEY),
      farazsmsLineNumberSet: Boolean(process.env.FARAZSMS_LINE_NUMBER),
      farazsmsPatternCodeSet: Boolean(process.env.FARAZSMS_PATTERN_CODE),
      farazsmsPatternVar: process.env.FARAZSMS_PATTERN_VAR || "var1",
      phone: normalized,
    });

    // Unified OTP: works for both customer and owner roles.
    // The owner-only restriction was removed — we just send OTP.
    const result = await sendOtp(normalized);
    if (!result.success) {
      console.error("[send-otp] sendOtp failed:", result.error, { phone: normalized });
      const debug = process.env.DEBUG_SMS === "true";
      return NextResponse.json(
        { error: result.error || "خطا در ارسال پیامک", debug: debug ? { providerError: result.error } : undefined },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[send-otp] unhandled error:", message, error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
