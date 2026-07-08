import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

export async function GET() {
  try {
    const { rows } = await sql`SELECT date_gregorian, start_time, end_time FROM blocked_times ORDER BY date_gregorian`;
    return NextResponse.json({ blockedTimes: rows });
  } catch {
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { blockedTimes } = await request.json();

    await sql`DELETE FROM blocked_times`;

    if (blockedTimes && blockedTimes.length > 0) {
      for (const b of blockedTimes) {
        await sql`
          INSERT INTO blocked_times (date_gregorian, start_time, end_time)
          VALUES (${b.date_gregorian}, ${b.start_time}, ${b.end_time})
        `;
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
