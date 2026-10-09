import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { requireStaff, staffAuthError } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";
import { resolveSalonId } from "@/lib/multi-tenant";
import { normalizeLacquer } from "@/lib/types";

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireStaff(request, "services.edit");
    if (!("staff" in auth)) {
      return NextResponse.json(staffAuthError(auth.status), { status: auth.status });
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

    const salonId = await resolveSalonId();
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
    // Lacquer (migration 030) would otherwise be dropped on every save
    // (same bug class as the image_url incident below) — or 500 pre-030.
    let withLacquer = true;
    try {
      const { rows: lacquerCols } = await sql.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'lacquer' LIMIT 1`
      );
      withLacquer = lacquerCols.length > 0;
    } catch {
      withLacquer = false;
    }
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
        // image_url/best_for (migration 015) were silently dropped before —
        // every save erased the service photo the owner had just uploaded.
        // image_url: null (client sends "" to clear). best_for: TEXT[] param.
        await client.query(
          salonId
            ? `INSERT INTO services (id, salon_id, name, description, duration_minutes, price, is_active, sort_order, addon_ids, priority_score, icon_key, is_popular, image_url, best_for${withLacquer ? ", lacquer" : ""})
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14::text[]${withLacquer ? ", $15" : ""})
               ON CONFLICT (id) DO UPDATE SET
                 name = $3, description = $4, duration_minutes = $5, price = $6,
                 is_active = $7, sort_order = $8, addon_ids = $9::jsonb, priority_score = $10, icon_key = $11, is_popular = $12,
                 image_url = $13, best_for = $14::text[]${withLacquer ? ", lacquer = $15" : ""}
               WHERE services.salon_id = EXCLUDED.salon_id`
            : `INSERT INTO services (id, name, description, duration_minutes, price, is_active, sort_order, addon_ids, priority_score, icon_key, is_popular, image_url, best_for${withLacquer ? ", lacquer" : ""})
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13::text[]${withLacquer ? ", $14" : ""})
               ON CONFLICT (id) DO UPDATE SET
                 name = $2, description = $3, duration_minutes = $4, price = $5,
                 is_active = $6, sort_order = $7, addon_ids = $8::jsonb, priority_score = $9, icon_key = $10, is_popular = $11,
                 image_url = $12, best_for = $13::text[]${withLacquer ? ", lacquer = $14" : ""}`,
          salonId
            ? [s.id, salonId, s.name, s.description || "", s.duration_minutes, s.price, s.is_active !== false, s.sort_order || i + 1, JSON.stringify(s.addon_ids || []), s.priority_score || 5, s.icon_key || null, s.is_popular === true, s.image_url || null, Array.isArray(s.best_for) ? s.best_for : [], ...(withLacquer ? [normalizeLacquer(s.lacquer)] : [])]
            : [s.id, s.name, s.description || "", s.duration_minutes, s.price, s.is_active !== false, s.sort_order || i + 1, JSON.stringify(s.addon_ids || []), s.priority_score || 5, s.icon_key || null, s.is_popular === true, s.image_url || null, Array.isArray(s.best_for) ? s.best_for : [], ...(withLacquer ? [normalizeLacquer(s.lacquer)] : [])]
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
