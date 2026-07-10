import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    const b = await request.json();

    // Validate required fields
    if (!b.id || !b.service_id || !b.customer_name || !b.customer_phone || !b.date_gregorian || !b.start_time || !b.end_time) {
      return NextResponse.json({ error: "اطلاعات ناقص است", debug: { missing: { id: !b.id, service_id: !b.service_id, customer_name: !b.customer_name, customer_phone: !b.customer_phone, date: !b.date, date_gregorian: !b.date_gregorian, start_time: !b.start_time, end_time: !b.end_time } } }, { status: 400 });
    }

    // Validate phone format (Iranian)
    const phone = String(b.customer_phone).replace(/\D/g, "");
    if (phone.length < 10 || !phone.startsWith("0")) {
      return NextResponse.json({ error: "شماره موبایل نامعتبر است" }, { status: 400 });
    }

    // Sanitize name
    const name = String(b.customer_name).slice(0, 100);

    // Validate service_id is non-empty string
    const serviceId = String(b.service_id).trim();
    if (!serviceId) {
      return NextResponse.json({ error: "شناسه خدمت نامعتبر است", debug: { service_id: b.service_id } }, { status: 400 });
    }

    // Normalize date_gregorian: extract YYYY-MM-DD from any format
    const dateStr = String(b.date_gregorian).split("T")[0];

    // Generate jalali date if missing
    const jalaliDate = b.date || dateStr;

    await sql`
      INSERT INTO bookings (id, user_id, service_id, selected_addons, customer_name, customer_phone, date, date_gregorian, start_time, end_time, status, phone_verified)
      VALUES (${b.id}, ${b.user_id || null}, ${serviceId}, ${JSON.stringify(b.selected_addons || [])}, ${name}, ${phone}, ${jalaliDate}, ${dateStr}::date, ${b.start_time}, ${b.end_time}, ${b.status || 'confirmed'}, ${b.phone_verified ?? true})
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Booking insert error:", error);
    return NextResponse.json({ error: "خطای سرور: " + String(error) }, { status: 500 });
  }
}
