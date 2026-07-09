import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    const b = await request.json();

    // Validate required fields (name can be empty for new users)
    if (!b.id || !b.service_id || !b.customer_phone || !b.date || !b.date_gregorian || !b.start_time || !b.end_time) {
      return NextResponse.json({ error: "اطلاعات ناقص است", debug: { id: !!b.id, service_id: !!b.service_id, name: !!b.customer_name, phone: !!b.customer_phone, date: !!b.date, date_gregorian: !!b.date_gregorian, start_time: !!b.start_time, end_time: !!b.end_time } }, { status: 400 });
    }

    // Validate phone format (Iranian)
    const phone = String(b.customer_phone).replace(/\D/g, "");
    if (phone.length < 10 || !phone.startsWith("0")) {
      return NextResponse.json({ error: "شماره موبایل نامعتبر است" }, { status: 400 });
    }

    // Sanitize name — use phone as fallback if name is empty
    const name = (String(b.customer_name || "").slice(0, 100) || phone);

    // Validate service_id is a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(b.service_id)) {
      return NextResponse.json({ error: "شناسه خدمت نامعتبر است", debug: { service_id: b.service_id } }, { status: 400 });
    }

    await sql`
      INSERT INTO bookings (id, user_id, service_id, selected_addons, customer_name, customer_phone, date, date_gregorian, start_time, end_time, status, phone_verified)
      VALUES (${b.id}, ${b.user_id || null}, ${b.service_id}, ${JSON.stringify(b.selected_addons || [])}, ${name}, ${phone}, ${b.date}, ${b.date_gregorian}, ${b.start_time}, ${b.end_time}, ${b.status || 'confirmed'}, ${b.phone_verified ?? true})
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Booking insert error:", error);
    return NextResponse.json({ error: "خطای سرور: " + String(error) }, { status: 500 });
  }
}
