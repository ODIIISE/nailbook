import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "bookings";
    const salonId = searchParams.get("salon_id") || "";

    let data: any[] = [];

    switch (type) {
      case "bookings":
        if (salonId) {
          const { rows } = await sql`
            SELECT id, customer_name, customer_phone, date_gregorian,
                   start_time, end_time, status, paid, created_at
            FROM bookings WHERE salon_id = ${salonId}
            ORDER BY date_gregorian DESC
          `;
          data = rows;
        } else {
          const { rows } = await sql`
            SELECT id, customer_name, customer_phone, date_gregorian,
                   start_time, end_time, status, paid, salon_id, created_at
            FROM bookings ORDER BY date_gregorian DESC LIMIT 1000
          `;
          data = rows;
        }
        break;

      case "users":
        if (salonId) {
          const { rows } = await sql`
            SELECT id, phone, name, role, created_at
            FROM users WHERE salon_id = ${salonId}
            ORDER BY created_at DESC
          `;
          data = rows;
        } else {
          const { rows } = await sql`
            SELECT id, phone, name, role, salon_id, created_at
            FROM users ORDER BY created_at DESC LIMIT 1000
          `;
          data = rows;
        }
        break;

      case "salons":
        const { rows } = await sql`
          SELECT id, name, slug, phone, address, is_active, created_at
          FROM salons ORDER BY created_at DESC
        `;
        data = rows;
        break;

      default:
        return NextResponse.json({ error: "نوع نامعتبر" }, { status: 400 });
    }

    // Convert to CSV
    if (data.length === 0) {
      return NextResponse.json({ csv: "", count: 0 });
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((h) => {
          const val = String(row[h] ?? "");
          return val.includes(",") || val.includes('"') || val.includes("\n")
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        }).join(",")
      ),
    ];

    return NextResponse.json({ csv: csvRows.join("\n"), count: data.length });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
