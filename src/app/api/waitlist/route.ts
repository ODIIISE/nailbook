import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

/**
 * POST /api/waitlist — Join the waitlist for a fully-booked day.
 * Body: { date_gregorian: string, customer_name: string, customer_phone: string, notification_method?: "sms" | "whatsapp" }
 */
export async function POST(request: NextRequest) {
  try {
    const { date_gregorian, customer_name, customer_phone, notification_method } = await request.json();

    if (!date_gregorian || !customer_phone) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    // Upsert: if already on waitlist for this day, return success (idempotent)
    const { rows } = await sql`
      INSERT INTO waitlist (date_gregorian, customer_name, customer_phone, notification_method)
      VALUES (${date_gregorian}::date, ${customer_name || ""}, ${customer_phone}, ${notification_method || "sms"})
      ON CONFLICT (customer_phone, date_gregorian) DO UPDATE SET
        customer_name = EXCLUDED.customer_name,
        notification_method = EXCLUDED.notification_method
      RETURNING id
    `;

    return NextResponse.json({ success: true, id: rows[0].id });
  } catch (error) {
    console.error("Waitlist join error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
