import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { getSalonId } from "@/lib/multi-tenant";

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const img = await request.json();
    const salonId = getSalonId();
    if (salonId) {
      const highlight = await sql.query("SELECT id FROM highlights WHERE id = $1 AND salon_id = $2", [img.highlight_id, salonId]);
      if (!highlight.rows[0]) return NextResponse.json({ error: "هایلایت یافت نشد" }, { status: 404 });
      await sql.query(
        `INSERT INTO highlight_images (id, salon_id, highlight_id, image_url, caption, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET image_url = $4, caption = $5, sort_order = $6
         WHERE highlight_images.salon_id = EXCLUDED.salon_id`,
        [img.id, salonId, img.highlight_id, img.image_url, img.caption || "", img.sort_order || 0]
      );
    } else {
      await sql`
        INSERT INTO highlight_images (id, highlight_id, image_url, caption, sort_order)
        VALUES (${img.id}, ${img.highlight_id}, ${img.image_url}, ${img.caption || ""}, ${img.sort_order || 0})
        ON CONFLICT (id) DO UPDATE SET image_url = ${img.image_url}, caption = ${img.caption || ""}, sort_order = ${img.sort_order || 0}
      `;
    }
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
    if (salonId) {
      await sql.query("DELETE FROM highlight_images WHERE id = $1 AND salon_id = $2", [id, salonId]);
    } else {
      await sql`DELETE FROM highlight_images WHERE id = ${id}`;
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
