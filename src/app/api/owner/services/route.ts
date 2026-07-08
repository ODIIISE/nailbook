import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

export async function PUT(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "لطفاً دوباره وارد شوید" }, { status: 401 });
    }

    const { services } = await request.json();

    if (!Array.isArray(services)) {
      return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
    }

    for (const s of services) {
      if (!s.name || typeof s.name !== "string") {
        return NextResponse.json({ error: "نام خدمت الزامی است" }, { status: 400 });
      }
      if (typeof s.price !== "number" || s.price < 0) {
        return NextResponse.json({ error: "قیمت نامعتبر است" }, { status: 400 });
      }
      if (typeof s.duration_minutes !== "number" || s.duration_minutes < 0) {
        return NextResponse.json({ error: "مدت زمان نامعتبر است" }, { status: 400 });
      }
    }

    const incomingIds = services.map((s) => s.id);
    const { rows: currentRows } = await sql`SELECT id FROM services`;
    const currentIds = currentRows.map((r) => r.id);
    const deletedIds = currentIds.filter((id) => !incomingIds.includes(id));

    if (deletedIds.length > 0) {
      for (const id of deletedIds) {
        await sql`UPDATE bookings SET service_id = NULL WHERE service_id = ${id}`;
        await sql`DELETE FROM services WHERE id = ${id}`;
      }
    }

    for (const [i, s] of services.entries()) {
      await sql`
        INSERT INTO services (id, name, description, duration_minutes, price, is_active, sort_order, addon_ids, priority_score)
        VALUES (${s.id}, ${s.name}, ${s.description || ""}, ${s.duration_minutes}, ${s.price}, ${s.is_active !== false}, ${s.sort_order || i + 1}, ${JSON.stringify(s.addon_ids || [])}, ${s.priority_score || 5})
        ON CONFLICT (id) DO UPDATE SET
          name = ${s.name}, description = ${s.description || ""}, duration_minutes = ${s.duration_minutes},
          price = ${s.price}, is_active = ${s.is_active !== false}, sort_order = ${s.sort_order || i + 1},
          addon_ids = ${JSON.stringify(s.addon_ids || [])}, priority_score = ${s.priority_score || 5}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "خطای سرور: " + String(error) }, { status: 500 });
  }
}
