import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const { data: verification, error } = await supabaseAdmin
      .from("verification_codes")
      .select("*")
      .eq("phone", phone)
      .eq("code", code)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !verification) {
      return NextResponse.json({ error: "کد تایید نادرست یا منقضی شده" }, { status: 400 });
    }

    await supabaseAdmin
      .from("verification_codes")
      .update({ verified: true })
      .eq("id", verification.id);

    let { data: user } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("phone", phone)
      .single();

    if (!user) {
      const { data: newUser } = await supabaseAdmin
        .from("users")
        .insert({ phone, name: "", role: "customer" })
        .select()
        .single();
      user = newUser;
    }

    const token = `auth_${Date.now()}_${Math.random().toString(36).slice(2)}`;

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
    console.error("Verify code error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
