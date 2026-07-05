import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const ownerSession = request.cookies.get("owner_session")?.value;
    if (!ownerSession) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    // Verify owner exists
    const { data: owner } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", ownerSession)
      .in("role", ["owner", "artist"])
      .single();

    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    // Fetch all users
    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("id, phone, name, role, failed_attempts, locked_until, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "خطا در دریافت اطلاعات" }, { status: 500 });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
