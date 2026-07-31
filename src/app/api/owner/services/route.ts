import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";

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

    const incomingIds = services.map((s) => s.id);
    const { rows: currentRows } = await sql`SELECT id FROM services`;
    const { rows: optionalColumns } = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'services'
        AND column_name IN ('image_url', 'best_for')
    `;
    const hasRichServiceColumns = optionalColumns.length === 2;
    const currentIds = currentRows.map((r) => r.id);
    const deletedIds = currentIds.filter((id) => !incomingIds.includes(id));

    // Use transaction for safe delete+insert
    let client;
    try {
      client = await sql.connect();
      await client.query("BEGIN");

      if (deletedIds.length > 0) {
        for (const id of deletedIds) {
          await client.query("UPDATE bookings SET service_id = NULL WHERE service_id = $1", [id]);
          await client.query("DELETE FROM services WHERE id = $1", [id]);
        }
      }

      for (const [i, s] of services.entries()) {
        const addonIds = Array.isArray(s.addon_ids) ? s.addon_ids : [];
        const bestFor = Array.isArray(s.best_for) ? s.best_for : [];
        const commonValues = [
          s.id,
          s.name,
          s.description || "",
          s.duration_minutes,
          s.price,
          s.is_active !== false,
          s.sort_order || i + 1,
          addonIds,
          s.priority_score || 5,
        ];

        if (hasRichServiceColumns) {
          const imageUrl = typeof s.image_url === "string" && s.image_url.length > 0 ? s.image_url : null;
          const normalizedBestFor = bestFor.filter((t: unknown): t is string => typeof t === "string" && t.length > 0);

          await client.query(
            `INSERT INTO services (
               id, name, description, duration_minutes, price,
               is_active, sort_order, addon_ids, priority_score,
               image_url, best_for
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO UPDATE SET
               name = $2,
               description = $3,
               duration_minutes = $4,
               price = $5,
               is_active = $6,
               sort_order = $7,
               addon_ids = $8,
               priority_score = $9,
               image_url = $10,
               best_for = $11`,
            [...commonValues, imageUrl, normalizedBestFor]
          );
        } else {
          // Migration 015 may be applied after this deployment. Keep the core
          // service editor usable on the base schema instead of failing every
          // save because optional presentation columns are absent.
          await client.query(
            `INSERT INTO services (
               id, name, description, duration_minutes, price,
               is_active, sort_order, addon_ids, priority_score
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET
               name = $2,
               description = $3,
               duration_minutes = $4,
               price = $5,
               is_active = $6,
               sort_order = $7,
               addon_ids = $8,
               priority_score = $9`,
            commonValues
          );
        }
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
