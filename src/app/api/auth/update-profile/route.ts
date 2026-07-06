import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { userId, name } = await request.json();

    if (!userId || !name) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("users")
      .update({ name: name.trim() })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: "خطا در بروزرسانی" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
