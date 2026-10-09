import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { requireStaff, staffAuthError } from "@/lib/owner-auth";
import { resolveSalonId } from "@/lib/multi-tenant";
import { normalizeLacquer } from "@/lib/types";

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
        lacquer: normalizeLacquer(r.lacquer),
        work_days: Array.isArray(r.work_days)
          ? (r.work_days as unknown[]).filter((d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)
          : [],
        service_ids: Array.isArray(r.service_ids)
          ? (r.service_ids as unknown[]).filter((id): id is string => typeof id === "string" && id.length > 0)
          : [],
      }));

    // Optional profile columns ride when migrated; the roles filter is
    // mandatory (pre-014 has no identifiable artists → empty list).
    let extraSelect = "";
    try {
      const { rows: colRows } = await sql.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'users'
         AND column_name IN ('specialty', 'lacquer', 'work_days', 'service_ids')`
      );
      extraSelect = colRows.map((r) => `, ${String(r.column_name)}`).join("");
    } catch {
      /* catalog unreadable — serve the base list */
    }
    try {
      const { rows } = salonId
        ? await sql.query(
            `SELECT id, name, phone${extraSelect} FROM users
             WHERE salon_id = $1 AND roles @> ARRAY['artist']::TEXT[]
             ORDER BY name`,
            [salonId]
          )
        : await sql.query(
            `SELECT id, name, phone${extraSelect} FROM users
             WHERE roles @> ARRAY['artist']::TEXT[]
             ORDER BY name`
          );
      return NextResponse.json({ artists: serialize(rows) });
    } catch (error) {
      // Pre-014 schemas have no roles column at all.
      const code = (error as { code?: string })?.code;
      const message = String((error as { message?: string })?.message || "");
      if (code !== "42703" && !/column .* does not exist/i.test(message)) throw error;
      return NextResponse.json({ artists: [] });
    }
  } catch (error) {
    console.error("Failed to fetch artists:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
