import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";
import { getSalonId } from "@/lib/multi-tenant";

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

    const salonId = getSalonId();
    const incomingIds = addons.map((a) => a.id);
    if (salonId && incomingIds.length > 0) {
      const foreignIds = await sql.query(
        "SELECT id FROM addons WHERE id = ANY($1) AND (salon_id IS NULL OR salon_id <> $2)",
        [incomingIds, salonId]
      );
      if (foreignIds.rows.length > 0) {
        return NextResponse.json({ error: "شناسه آپشن متعلق به این سالن نیست" }, { status: 400 });
      }
    }
    const currentResult = salonId
      ? await sql.query("SELECT id FROM addons WHERE salon_id = $1", [salonId])
      : await sql`SELECT id FROM addons`;
    const currentRows = currentResult.rows;
    const currentIds = currentRows.map((r) => r.id);
    const deletedIds = currentIds.filter((id) => !incomingIds.includes(id));

    // Use transaction for safe delete+insert
    let client;
    try {
      client = await sql.connect();
      await client.query("BEGIN");

      if (deletedIds.length > 0) {
        const servicesResult = salonId
          ? await client.query("SELECT id, addon_ids FROM services WHERE salon_id = $1", [salonId])
          : await client.query("SELECT id, addon_ids FROM services");
        const services = servicesResult.rows;
        for (const svc of services) {
          const currentAddonIds: string[] = svc.addon_ids || [];
          const cleanedIds = currentAddonIds.filter((aid) => !deletedIds.includes(aid));
          if (cleanedIds.length !== currentAddonIds.length) {
            await client.query(
              salonId
                ? "UPDATE services SET addon_ids = $1 WHERE id = $2 AND salon_id = $3"
                : "UPDATE services SET addon_ids = $1 WHERE id = $2",
              salonId ? [JSON.stringify(cleanedIds), svc.id, salonId] : [JSON.stringify(cleanedIds), svc.id]
            );
          }
        }
        for (const id of deletedIds) {
          await client.query(
            salonId ? "DELETE FROM addons WHERE id = $1 AND salon_id = $2" : "DELETE FROM addons WHERE id = $1",
            salonId ? [id, salonId] : [id]
          );
        }
      }

      for (const [i, a] of addons.entries()) {
        await client.query(
          salonId
            ? `INSERT INTO addons (id, salon_id, name, price, duration_minutes, is_active, sort_order)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (id) DO UPDATE SET
                 name = $3, price = $4, duration_minutes = $5, is_active = $6, sort_order = $7
               WHERE addons.salon_id = EXCLUDED.salon_id`
            : `INSERT INTO addons (id, name, price, duration_minutes, is_active, sort_order)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (id) DO UPDATE SET
                 name = $2, price = $3, duration_minutes = $4, is_active = $5, sort_order = $6`,
          salonId
            ? [a.id, salonId, a.name, a.price, a.duration_minutes, a.is_active !== false, a.sort_order || i + 1]
            : [a.id, a.name, a.price, a.duration_minutes, a.is_active !== false, a.sort_order || i + 1]
        );
      }

      await client.query("COMMIT");
    } catch (e) {
      if (client) try { await client.query("ROLLBACK"); } catch {}
      throw e;
    } finally {
      if (client) client.release();
    }

    logActivity({
      eventType: "addon_updated",
      entityType: "addon",
      description: `${addons.length} آپشن به‌روزرسانی شد`,
      metadata: { count: addons.length, deleted: deletedIds.length },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update addons:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
