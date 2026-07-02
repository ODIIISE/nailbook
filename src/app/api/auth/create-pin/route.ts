import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { phone, pin, name, role } = await request.json();

    if (!phone || !pin || pin.length !== 4) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();

    if (existing) {
      return NextResponse.json({ error: "کاربر قبلاً ثبت‌نام شده" }, { status: 400 });
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .insert({
        phone,
        pin,
        name: name || "",
        role: role || "customer",
        failed_attempts: 0,
      })
      .select("id, phone, name, role")
      .single();

    if (error) {
      return NextResponse.json({ error: "خطا در ثبت‌نام" }, { status: 500 });
    }

    const token = `pin_${Date.now()}_${Math.random().toString(36).slice(2)}`;

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
    console.error("Create PIN error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
