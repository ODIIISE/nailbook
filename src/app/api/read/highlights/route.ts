import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";

type HighlightRow = {
  id: string;
  name: string;
  cover_url: string | null;
  sort_order: number;
  service_id: string | null;
};

export async function GET() {
  try {
    let highlights: HighlightRow[];
    try {
      const result = await sql<HighlightRow>`
        SELECT id, name, cover_url, sort_order, service_id FROM highlights ORDER BY sort_order
      `;
      highlights = result.rows;
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const message = String((error as { message?: string })?.message || "");
      if (code !== "42703" && !/column .*service_id.*does not exist/i.test(message)) throw error;
      const result = await sql<Omit<HighlightRow, "service_id">>`
        SELECT id, name, cover_url, sort_order FROM highlights ORDER BY sort_order
      `;
      highlights = result.rows.map((row) => ({ ...row, service_id: null }));
    }
    const { rows: images } = await sql`
      SELECT id, highlight_id, image_url, caption, sort_order FROM highlight_images ORDER BY sort_order
    `;

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
      id: h.id,
      name: h.name,
      cover_url: h.cover_url,
      sort_order: h.sort_order,
      service_id: h.service_id || null,
      images: imageMap.get(h.id) || [],
    })));
  } catch {
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
    if (!h || typeof h.id !== "string" || !h.id || typeof h.name !== "string" || !h.name.trim()) {
      return NextResponse.json({ error: "اطلاعات هایلایت نامعتبر است" }, { status: 400 });
    }
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(h.id)) {
      return NextResponse.json({ error: "شناسه هایلایت نامعتبر است" }, { status: 400 });
    }
    const serviceId = typeof h.service_id === "string" && h.service_id ? h.service_id : null;
    if (serviceId && !uuidPattern.test(serviceId)) {
      return NextResponse.json({ error: "خدمت نامعتبر است" }, { status: 400 });
    }
    if (serviceId) {
      const { rows: serviceRows } = await sql`SELECT id FROM services WHERE id = ${serviceId} AND is_active = true LIMIT 1`;
      if (serviceRows.length === 0) {
        return NextResponse.json({ error: "خدمت یافت نشد" }, { status: 400 });
      }
    }
    try {
      await sql`
        INSERT INTO highlights (id, name, cover_url, sort_order, service_id)
        VALUES (${h.id}, ${h.name.trim()}, ${typeof h.cover_url === "string" ? h.cover_url : null}, ${Number(h.sort_order) || 0}, ${serviceId})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, cover_url = EXCLUDED.cover_url,
          sort_order = EXCLUDED.sort_order, service_id = EXCLUDED.service_id
      `;
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const message = String((error as { message?: string })?.message || "");
      if (code !== "42703" && !/column .*service_id.*does not exist/i.test(message)) throw error;
      await sql`
        INSERT INTO highlights (id, name, cover_url, sort_order)
        VALUES (${h.id}, ${h.name.trim()}, ${typeof h.cover_url === "string" ? h.cover_url : null}, ${Number(h.sort_order) || 0})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, cover_url = EXCLUDED.cover_url,
          sort_order = EXCLUDED.sort_order
      `;
    }

    logActivity({
      eventType: "highlight_updated",
      entityType: "highlight",
      entityId: h.id,
      description: `هایلایت "${h.name}" به‌روزرسانی شد`,
      metadata: { name: h.name },
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

    // Get highlight name for logging
    const { rows: highlight } = await sql`SELECT name FROM highlights WHERE id = ${id}`;

    await sql`DELETE FROM highlight_images WHERE highlight_id = ${id}`;
    await sql`DELETE FROM highlights WHERE id = ${id}`;

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
