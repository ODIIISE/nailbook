import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const img = await request.json();
    await sql`
      INSERT INTO highlight_images (id, highlight_id, image_url, caption, sort_order)
      VALUES (${img.id}, ${img.highlight_id}, ${img.image_url}, ${img.caption || ""}, ${img.sort_order || 0})
      ON CONFLICT (id) DO UPDATE SET image_url = ${img.image_url}, caption = ${img.caption || ""}, sort_order = ${img.sort_order || 0}
    `;
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
    await sql`DELETE FROM highlight_images WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
