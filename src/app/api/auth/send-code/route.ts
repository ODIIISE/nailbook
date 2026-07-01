import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendVerificationCode, generateCode } from "@/lib/sms";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await supabaseAdmin.from("verification_codes").insert({
      phone,
      code,
      expires_at: expiresAt,
    });

    const sent = await sendVerificationCode(phone, code);

    if (!sent) {
      return NextResponse.json({ error: "خطا در ارسال پیامک" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "کد تایید ارسال شد" });
  } catch (error) {
    console.error("Send code error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
