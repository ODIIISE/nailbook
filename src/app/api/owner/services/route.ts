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

    const { services } = await request.json();

    if (!Array.isArray(services)) {
      return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
    }

    for (const s of services) {
      if (!s.name || typeof s.name !== "string") {
        return NextResponse.json({ error: "نام خدمت الزامی است" }, { status: 400 });
      }
      const price = Number(s.price);
      if (isNaN(price) || price < 0) {
        return NextResponse.json({ error: "قیمت نامعتبر است" }, { status: 400 });
      }
      const duration = Number(s.duration_minutes);
      if (isNaN(duration) || duration < 5) {
        return NextResponse.json({ error: "مدت زمان باید حداقل ۵ دقیقه باشد" }, { status: 400 });
      }
    }

    const salonId = getSalonId();
    const incomingIds = services.map((s) => s.id);
    if (salonId && incomingIds.length > 0) {
      const foreignIds = await sql.query(
        "SELECT id FROM services WHERE id = ANY($1) AND (salon_id IS NULL OR salon_id <> $2)",
        [incomingIds, salonId]
      );
      if (foreignIds.rows.length > 0) {
        return NextResponse.json({ error: "شناسه خدمت متعلق به این سالن نیست" }, { status: 400 });
      }
    }
    const currentResult = salonId
      ? await sql.query("SELECT id FROM services WHERE salon_id = $1", [salonId])
      : await sql`SELECT id FROM services`;
    const currentRows = currentResult.rows;
    const currentIds = currentRows.map((r) => r.id);
    const deletedIds = currentIds.filter((id) => !incomingIds.includes(id));

    // Use transaction for safe delete+insert
    let client;
    try {
      client = await sql.connect();
      await client.query("BEGIN");

      if (deletedIds.length > 0) {
        for (const id of deletedIds) {
          await client.query(
            salonId
              ? "UPDATE bookings SET service_id = NULL WHERE service_id = $1 AND salon_id = $2"
              : "UPDATE bookings SET service_id = NULL WHERE service_id = $1",
            salonId ? [id, salonId] : [id]
          );
          await client.query(
            salonId
              ? "DELETE FROM services WHERE id = $1 AND salon_id = $2"
              : "DELETE FROM services WHERE id = $1",
            salonId ? [id, salonId] : [id]
          );
        }
      }

      for (const [i, s] of services.entries()) {
        await client.query(
          salonId
            ? `INSERT INTO services (id, salon_id, name, description, duration_minutes, price, is_active, sort_order, addon_ids, priority_score)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
               ON CONFLICT (id) DO UPDATE SET
                 name = $3, description = $4, duration_minutes = $5, price = $6,
                 is_active = $7, sort_order = $8, addon_ids = $9, priority_score = $10
               WHERE services.salon_id = EXCLUDED.salon_id`
            : `INSERT INTO services (id, name, description, duration_minutes, price, is_active, sort_order, addon_ids, priority_score)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (id) DO UPDATE SET
                 name = $2, description = $3, duration_minutes = $4, price = $5,
                 is_active = $6, sort_order = $7, addon_ids = $8, priority_score = $9`,
          salonId
            ? [s.id, salonId, s.name, s.description || "", s.duration_minutes, s.price, s.is_active !== false, s.sort_order || i + 1, JSON.stringify(s.addon_ids || []), s.priority_score || 5]
            : [s.id, s.name, s.description || "", s.duration_minutes, s.price, s.is_active !== false, s.sort_order || i + 1, JSON.stringify(s.addon_ids || []), s.priority_score || 5]
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
      eventType: "service_updated",
      entityType: "service",
      description: `${services.length} خدمت به‌روزرسانی شد`,
      metadata: { count: services.length },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update services:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
