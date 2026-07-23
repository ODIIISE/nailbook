import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { id } = await params;

    const { rows } = await sql`
      SELECT id, name, slug, phone, address, description, slogan,
             hero_image_url, logo_url, working_hours, working_hours_text,
             specific_days_off, slot_buffer_minutes, slot_interval_minutes,
             early_extra_hours, late_extra_hours, expand_threshold,
             proximity_window_hours, allow_overflow, overflow_minutes,
             is_active, created_at,
        (SELECT COUNT(*) FROM users WHERE salon_id = ${id}) as user_count,
        (SELECT COUNT(*) FROM bookings WHERE salon_id = ${id}) as booking_count,
        (SELECT COUNT(*) FROM services WHERE salon_id = ${id}) as service_count
      FROM salons WHERE id = ${id}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "سالن یافت نشد" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Fetch salon error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const allowedFields = [
      "name", "slug", "phone", "address", "description", "slogan",
      "hero_image_url", "logo_url", "is_active",
      "slot_buffer_minutes", "slot_interval_minutes",
      "early_extra_hours", "late_extra_hours",
      "expand_threshold", "proximity_window_hours",
      "allow_overflow", "overflow_minutes",
    ];

    for (const key of Object.keys(body)) {
      if (allowedFields.includes(key)) {
        await sql.query(`UPDATE salons SET ${key} = $1 WHERE id = $2`, [body[key], id]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update salon error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { id } = await params;

    await sql`DELETE FROM salons WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete salon error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
