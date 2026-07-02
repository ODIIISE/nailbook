import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { phone, pin } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, phone, pin, role, name, failed_attempts, locked_until")
      .eq("phone", phone)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      return NextResponse.json({
        error: `حساب شما به مدت ${remaining} دقیقه قفل شده است`,
        locked: true,
      });
    }

    if (user.pin !== pin) {
      const newAttempts = (user.failed_attempts || 0) + 1;
      const updateData: Record<string, unknown> = { failed_attempts: newAttempts };

      if (newAttempts >= 5) {
        updateData.locked_until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        updateData.failed_attempts = 0;
      }

      await supabaseAdmin.from("users").update(updateData).eq("id", user.id);

      return NextResponse.json({
        error: newAttempts >= 5
          ? "حساب شما به مدت ۶۰ دقیقه قفل شده است"
          : `کد نادرست است. ${5 - newAttempts} تلاش باقی‌مانده`,
        attemptsLeft: 5 - newAttempts,
      });
    }

    await supabaseAdmin
      .from("users")
      .update({ failed_attempts: 0, locked_until: null })
      .eq("id", user.id);

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
    console.error("Verify PIN error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
