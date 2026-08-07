import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";
import { getSalonId } from "@/lib/multi-tenant";

// Mirrors read/services: addon_ids is a TEXT[] whose element is a JSON array
// string, so tolerate both that and a plain array of strings.
function normalizeTextArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  if (typeof value === "string") {
    return value
      .replace(/^\s*\[|\]\s*$/g, "")
      .split(",")
      .map((item) => item.replace(/^"|"$/g, "").trim())
      .filter(Boolean);
  }
  return [];
}

function isMissingColumn(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  const message = String((error as { message?: string })?.message || "");
  return code === "42703" || /column .* does not exist/i.test(message);
}

const HIGHLIGHT_COLUMNS = "id, name, cover_url, sort_order, service_id, addon_ids";

function serializeHighlight(h: Record<string, unknown>) {
  return {
    id: h.id,
    name: h.name,
    cover_url: typeof h.cover_url === "string" && h.cover_url.length > 0 ? h.cover_url : null,
    sort_order: Number(h.sort_order) || 0,
    service_id: typeof h.service_id === "string" && h.service_id.length > 0 ? h.service_id : null,
    addon_ids: normalizeTextArray(h.addon_ids),
  };
}

export async function GET() {
  try {
    const salonId = getSalonId();
    // HIGHLIGHT_COLUMNS is a compile-time constant — safe to interpolate.
    const highlightsResult = salonId
      ? await sql.query(`SELECT ${HIGHLIGHT_COLUMNS} FROM highlights WHERE salon_id = $1 ORDER BY sort_order, id`, [salonId])
      : await sql.query(`SELECT ${HIGHLIGHT_COLUMNS} FROM highlights ORDER BY sort_order, id`);
    const imagesResult = salonId
      ? await sql.query("SELECT id, highlight_id, image_url, caption, sort_order FROM highlight_images WHERE salon_id = $1 ORDER BY sort_order, id", [salonId])
      : await sql`SELECT id, highlight_id, image_url, caption, sort_order FROM highlight_images ORDER BY sort_order, id`;
    const { rows: highlights } = highlightsResult;
    const { rows: images } = imagesResult;

    const imageMap = new Map<string, unknown[]>();
    for (const img of images) {
      if (!imageMap.has(img.highlight_id)) imageMap.set(img.highlight_id, []);
      imageMap.get(img.highlight_id)!.push({
        id: img.id,
        highlight_id: img.highlight_id,
        image_url: img.image_url,
        caption: img.caption || "",
        sort_order: img.sort_order,
      });
    }

    return NextResponse.json(highlights.map((h) => ({
      ...serializeHighlight(h),
      images: imageMap.get(h.id) || [],
    })));
  } catch (error) {
    // A deployment may serve the new UI before migration 019/012 has been
    // applied. Fall back to the base columns so the lookbook still renders.
    if (isMissingColumn(error)) {
      try {
        const salonId = getSalonId();
        const highlightsResult = salonId
          ? await sql.query("SELECT id, name, cover_url, sort_order FROM highlights WHERE salon_id = $1 ORDER BY sort_order, id", [salonId])
          : await sql`SELECT id, name, cover_url, sort_order FROM highlights ORDER BY sort_order, id`;
        const imagesResult = salonId
          ? await sql.query("SELECT id, highlight_id, image_url, caption, sort_order FROM highlight_images WHERE salon_id = $1 ORDER BY sort_order, id", [salonId])
          : await sql`SELECT id, highlight_id, image_url, caption, sort_order FROM highlight_images ORDER BY sort_order, id`;
        const imageMap = new Map<string, unknown[]>();
        for (const img of imagesResult.rows) {
          if (!imageMap.has(img.highlight_id)) imageMap.set(img.highlight_id, []);
          imageMap.get(img.highlight_id)!.push({
            id: img.id, highlight_id: img.highlight_id, image_url: img.image_url,
            caption: img.caption || "", sort_order: img.sort_order,
          });
        }
        return NextResponse.json(highlightsResult.rows.map((h) => ({
          ...serializeHighlight(h),
          images: imageMap.get(h.id) || [],
        })));
      } catch {
        return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
      }
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const h = await request.json();
    const salonId = getSalonId();
    const name = typeof h.name === "string" ? h.name : "";
    if (!name) return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });
    // Keep stale references from poisoning the FK: only persist UUID-shaped
    // service ids that actually exist; anything else is stored as NULL.
    const serviceId = typeof h.service_id === "string" && h.service_id.trim()
      ? h.service_id.trim()
      : null;
    const addonIds = normalizeTextArray(h.addon_ids);

    if (salonId) {
      const servicesRes = serviceId
        ? await sql.query("SELECT 1 FROM services WHERE id = $1 AND salon_id = $2", [serviceId, salonId])
        : { rows: [] };
      const validServiceId = servicesRes.rows.length > 0 ? serviceId : null;

      await sql.query(
        `INSERT INTO highlights (id, salon_id, name, cover_url, sort_order, service_id, addon_ids)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           name = $3, cover_url = $4, sort_order = $5, service_id = $6, addon_ids = $7
         WHERE highlights.salon_id = EXCLUDED.salon_id`,
        [h.id, salonId, name, h.cover_url || null, h.sort_order || 0, validServiceId, JSON.stringify(addonIds)]
      );
    } else {
      const servicesRes = serviceId
        ? await sql.query("SELECT 1 FROM services WHERE id = $1", [serviceId])
        : { rows: [] };
      const validServiceId = servicesRes.rows.length > 0 ? serviceId : null;

      await sql.query(
        `INSERT INTO highlights (id, name, cover_url, sort_order, service_id, addon_ids)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = $2, cover_url = $3, sort_order = $4, service_id = $5, addon_ids = $6`,
        [h.id, name, h.cover_url || null, h.sort_order || 0, validServiceId, JSON.stringify(addonIds)]
      );
    }

    logActivity({
      eventType: "highlight_updated",
      entityType: "highlight",
      entityId: h.id,
      description: `هایلایت "${name}" به‌روزرسانی شد`,
      metadata: { name },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 });

    const salonId = getSalonId();
    const highlightResult = salonId
      ? await sql.query("SELECT name FROM highlights WHERE id = $1 AND salon_id = $2", [id, salonId])
      : await sql`SELECT name FROM highlights WHERE id = ${id}`;
    const highlight = highlightResult.rows;
    if (!highlight[0]) return NextResponse.json({ error: "هایلایت یافت نشد" }, { status: 404 });

    if (salonId) {
      await sql.query("DELETE FROM highlight_images WHERE highlight_id = $1 AND salon_id = $2", [id, salonId]);
      await sql.query("DELETE FROM highlights WHERE id = $1 AND salon_id = $2", [id, salonId]);
    } else {
      await sql`DELETE FROM highlight_images WHERE highlight_id = ${id}`;
      await sql`DELETE FROM highlights WHERE id = ${id}`;
    }

    logActivity({
      eventType: "highlight_deleted",
      entityType: "highlight",
      entityId: id,
      description: `هایلایت "${highlight[0]?.name || id}" حذف شد`,
      metadata: { name: highlight[0]?.name },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
