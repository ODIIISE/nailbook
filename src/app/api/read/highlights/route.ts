import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";

export async function GET() {
  try {
    const { rows: highlights } = await sql`
      SELECT id, name, cover_url, sort_order FROM highlights ORDER BY sort_order
    `;
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
    await sql`
      INSERT INTO highlights (id, name, cover_url, sort_order)
      VALUES (${h.id}, ${h.name}, ${h.cover_url || null}, ${h.sort_order || 0})
      ON CONFLICT (id) DO UPDATE SET name = ${h.name}, cover_url = ${h.cover_url || null}, sort_order = ${h.sort_order || 0}
    `;

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
