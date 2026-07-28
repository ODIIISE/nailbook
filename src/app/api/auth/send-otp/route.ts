import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { sendOtp } from "@/lib/otp-service";
import { normalizeDigits, isValidIranianPhone } from "@/lib/digits";

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

    // Help diagnose provider configuration in production without exposing secrets.
    console.log("[send-otp] config check:", {
      provider: process.env.SMS_PROVIDER || "default (farazsms)",
      farazsmsApiKeySet: Boolean(process.env.FARAZSMS_API_KEY),
      farazsmsLineNumberSet: Boolean(process.env.FARAZSMS_LINE_NUMBER),
      farazsmsPatternCodeSet: Boolean(process.env.FARAZSMS_PATTERN_CODE),
      farazsmsPatternVar: process.env.FARAZSMS_PATTERN_VAR || "var1",
      roleContext,
      phone: normalized,
    });

    // If this is an owner login context, only send OTP to registered owners.
    // Returning an explicit error keeps the user from being trapped on the OTP step
    // waiting for an SMS that will never arrive.
    if (roleContext === "owner") {
      const { rows } = await sql`SELECT id, role FROM users WHERE phone = ${normalized} AND role = 'owner' LIMIT 1`;
      if (rows.length === 0) {
        return NextResponse.json({ error: "شماره موبایل مدیر یافت نشد" }, { status: 404 });
      }
    }

    const result = await sendOtp(normalized);
    if (!result.success) {
      console.error("[send-otp] sendOtp failed:", result.error, { phone: normalized });
      return NextResponse.json({ error: result.error || "خطا در ارسال پیامک" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[send-otp] unhandled error:", message, error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
