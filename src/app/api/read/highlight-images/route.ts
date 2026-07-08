import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    const img = await request.json();
    await sql`
      INSERT INTO highlight_images (id, highlight_id, image_url, caption, sort_order)
      VALUES (${img.id}, ${img.highlight_id}, ${img.image_url}, ${img.caption || ""}, ${img.sort_order || 0})
      ON CONFLICT (id) DO UPDATE SET image_url = ${img.image_url}, caption = ${img.caption || ""}, sort_order = ${img.sort_order || 0}
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
    await sql`DELETE FROM highlight_images WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
