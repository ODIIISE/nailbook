import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

/**
 * GET /api/owner/waitlist — List waitlist entries (owner only).
 * Optional query: ?date=YYYY-MM-DD to filter by date.
 */
export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    let rows;
    if (date) {
      const result = await sql`
        SELECT id, date_gregorian::text as date_gregorian, customer_name, customer_phone, notification_method, notified, created_at
        FROM waitlist
        WHERE date_gregorian = ${date}::date
        ORDER BY created_at DESC
      `;
      rows = result.rows;
    } else {
      const result = await sql`
        SELECT id, date_gregorian::text as date_gregorian, customer_name, customer_phone, notification_method, notified, created_at
        FROM waitlist
        WHERE date_gregorian >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY date_gregorian DESC, created_at DESC
        LIMIT 200
      `;
      rows = result.rows;
    }

    const normalized = rows.map((r) => ({
      ...r,
      date_gregorian: r.date_gregorian ? r.date_gregorian.split("T")[0] : r.date_gregorian,
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Fetch waitlist error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

/**
 * PATCH /api/owner/waitlist — Mark waitlist entries as notified (owner only).
 * Body: { ids: string[] }
 */
export async function PATCH(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const { ids } = await request.json();
    if (!ids?.length) {
      return NextResponse.json({ error: "شناسه‌ای ارسال نشد" }, { status: 400 });
    }

    await sql`UPDATE waitlist SET notified = true WHERE id = ANY(${ids}::uuid[])`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update waitlist error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
