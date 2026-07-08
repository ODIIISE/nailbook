import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

export async function PUT(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "لطفاً دوباره وارد شوید" }, { status: 401 });
    }

    const { addons } = await request.json();

    if (!Array.isArray(addons)) {
      return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
    }

    for (const a of addons) {
      if (!a.name || typeof a.name !== "string") {
        return NextResponse.json({ error: "نام آپشن الزامی است" }, { status: 400 });
      }
      const price = Number(a.price);
      if (isNaN(price) || price < 0) {
        return NextResponse.json({ error: "قیمت نامعتبر است" }, { status: 400 });
      }
      const duration = Number(a.duration_minutes);
      if (isNaN(duration) || duration < 0) {
        return NextResponse.json({ error: "مدت زمان نامعتبر است" }, { status: 400 });
      }
    }

    const incomingIds = addons.map((a) => a.id);
    const { rows: currentRows } = await sql`SELECT id FROM addons`;
    const currentIds = currentRows.map((r) => r.id);
    const deletedIds = currentIds.filter((id) => !incomingIds.includes(id));

    if (deletedIds.length > 0) {
      const { rows: services } = await sql`SELECT id, addon_ids FROM services`;
      for (const svc of services) {
        const currentAddonIds: string[] = svc.addon_ids || [];
        const cleanedIds = currentAddonIds.filter((aid) => !deletedIds.includes(aid));
        if (cleanedIds.length !== currentAddonIds.length) {
          await sql`UPDATE services SET addon_ids = ${JSON.stringify(cleanedIds)} WHERE id = ${svc.id}`;
        }
      }
      for (const id of deletedIds) {
        await sql`DELETE FROM addons WHERE id = ${id}`;
      }
    }

    for (const [i, a] of addons.entries()) {
      await sql`
        INSERT INTO addons (id, name, price, duration_minutes, is_active, sort_order)
        VALUES (${a.id}, ${a.name}, ${a.price}, ${a.duration_minutes}, ${a.is_active !== false}, ${a.sort_order || i + 1})
        ON CONFLICT (id) DO UPDATE SET
          name = ${a.name}, price = ${a.price}, duration_minutes = ${a.duration_minutes},
          is_active = ${a.is_active !== false}, sort_order = ${a.sort_order || i + 1}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "خطای سرور: " + String(error) }, { status: 500 });
  }
}
