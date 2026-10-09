import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { requireStaff, staffAuthError } from "@/lib/owner-auth";
import { resolveSalonId } from "@/lib/multi-tenant";

/**
 * GET: staff-visible artist directory for booking assignment (manual
 * reserve, timeline). Any staff role with bookings.manage may list — the
 * full users directory stays behind users.manage.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff(request, "bookings.manage");
    if (!("staff" in auth)) return NextResponse.json(staffAuthError(auth.status), { status: auth.status });

    const salonId = await resolveSalonId();
    const serialize = (rows: Array<Record<string, unknown>>) =>
      rows.map((r) => ({
        id: String(r.id),
        name: typeof r.name === "string" && r.name.trim() ? r.name.trim() : "هنرمند",
        phone: typeof r.phone === "string" ? r.phone : "",
        specialty: typeof r.specialty === "string" ? r.specialty : "",
      }));

    try {
      const { rows } = salonId
        ? await sql.query(
            `SELECT id, name, phone, specialty FROM users
             WHERE salon_id = $1 AND roles @> ARRAY['artist']::TEXT[]
             ORDER BY name`,
            [salonId]
          )
        : await sql`SELECT id, name, phone, specialty FROM users
            WHERE roles @> ARRAY['artist']::TEXT[]
            ORDER BY name`;
      return NextResponse.json({ artists: serialize(rows) });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const message = String((error as { message?: string })?.message || "");
      if (code !== "42703" && !/column .* does not exist/i.test(message)) throw error;
      // Pre-025 (no specialty) — retry without it; pre-014 (no roles at
      // all) has no identifiable artists, which is an empty list.
      try {
        const { rows } = salonId
          ? await sql.query(
              `SELECT id, name, phone FROM users
               WHERE salon_id = $1 AND roles @> ARRAY['artist']::TEXT[]
               ORDER BY name`,
              [salonId]
            )
          : await sql`SELECT id, name, phone FROM users
              WHERE roles @> ARRAY['artist']::TEXT[]
              ORDER BY name`;
        return NextResponse.json({ artists: serialize(rows) });
      } catch (retryError) {
        const retryCode = (retryError as { code?: string })?.code;
        const retryMessage = String((retryError as { message?: string })?.message || "");
        if (retryCode !== "42703" && !/column .* does not exist/i.test(retryMessage)) throw retryError;
        return NextResponse.json({ artists: [] });
      }
    }
  } catch (error) {
    console.error("Failed to fetch artists:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
