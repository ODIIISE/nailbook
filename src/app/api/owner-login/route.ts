import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import crypto from "crypto";

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const { phone, pin } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const hashedPin = hashPin(pin);

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, phone, name, role, pin")
      .eq("phone", phone)
      .eq("role", "owner")
      .single();

    if (error || !user || user.pin !== hashedPin) {
      return NextResponse.json({ error: "شماره یا رمز عبور اشتباه است" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set("owner_session", user.id, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Owner login error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
