import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    const { rows: highlights } = await sql`SELECT * FROM highlights ORDER BY sort_order`;
    const { rows: images } = await sql`SELECT * FROM highlight_images ORDER BY sort_order`;

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
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const h = await request.json();
    await sql`
      INSERT INTO highlights (id, name, cover_url, sort_order)
      VALUES (${h.id}, ${h.name}, ${h.cover_url || null}, ${h.sort_order || 0})
      ON CONFLICT (id) DO UPDATE SET name = ${h.name}, cover_url = ${h.cover_url || null}, sort_order = ${h.sort_order || 0}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await sql`DELETE FROM highlight_images WHERE highlight_id = ${id}`;
    await sql`DELETE FROM highlights WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
