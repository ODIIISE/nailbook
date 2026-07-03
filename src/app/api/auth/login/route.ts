import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import crypto from "crypto";

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const hashedPin = hashPin(password);

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, phone, name, role, pin")
      .eq("phone", phone)
      .eq("role", "artist")
      .single();

    if (error || !user || user.pin !== hashedPin) {
      return NextResponse.json({ error: "شماره یا رمز عبور اشتباه است" }, { status: 401 });
    }

    const token = `auth_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    await supabaseAdmin.from("sessions").insert({
      user_id: user.id,
      token,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
      token,
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
