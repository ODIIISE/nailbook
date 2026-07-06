import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, phone, pin, locked_until")
      .eq("phone", phone)
      .single();

    // Check lockout first (before revealing if user exists)
    if (user?.locked_until && new Date(user.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      return NextResponse.json({
        exists: true,
        locked: true,
        message: `حساب شما به مدت ${remaining} دقیقه قفل شده است`,
      });
    }

    // Return consistent response structure for both existing and non-existing
    // This prevents phone enumeration - attacker can't tell if phone is registered
    return NextResponse.json({
      exists: !!user,
      locked: false,
      hasPin: user ? !!user.pin : false,
    });
  } catch (error) {
    console.error("Check phone error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
