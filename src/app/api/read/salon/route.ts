import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    const { rows } = await sql`SELECT * FROM salon_info LIMIT 1`;
    if (!rows[0]) return NextResponse.json(null);
    const s = rows[0];
    return NextResponse.json({
      id: s.id,
      name: s.name,
      description: s.description,
      slogan: s.slogan || "",
      phone: s.phone,
      address: s.address,
      hero_image_url: s.hero_image_url,
      logo_url: s.logo_url,
      working_hours_text: s.working_hours_text || "شنبه تا پنج شنبه . ۱۰ تا ۱۸",
      working_hours: s.working_hours,
      slot_buffer_minutes: s.slot_buffer_minutes,
      slot_interval_minutes: s.slot_interval_minutes,
      specific_days_off: s.specific_days_off,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
