import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { resolveSalonId } from "@/lib/multi-tenant";
import { normalizeLacquer } from "@/lib/types";

/**
 * GET: public artist directory for the customer booking flow (artist step).
 * No auth — names, specialties and schedules are public salon info like
 * services. Phones are NEVER exposed here (see /api/owner/artists).
 */
export async function GET() {
  try {
    const salonId = await resolveSalonId();
    const serialize = (rows: Array<Record<string, unknown>>) =>
      rows.map((r) => ({
        id: String(r.id),
        name: typeof r.name === "string" && r.name.trim() ? r.name.trim() : "هنرمند",
        specialty: typeof r.specialty === "string" ? r.specialty : "",
        lacquer: normalizeLacquer(r.lacquer),
        work_days: Array.isArray(r.work_days)
          ? (r.work_days as unknown[]).filter(
              (d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6
            )
          : [],
        service_ids: Array.isArray(r.service_ids)
          ? (r.service_ids as unknown[]).filter(
              (id): id is string => typeof id === "string" && id.length > 0
            )
          : [],
      }));

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
            `SELECT id, name${extraSelect} FROM users
             WHERE salon_id = $1 AND roles @> ARRAY['artist']::TEXT[]
             ORDER BY name`,
            [salonId]
          )
        : await sql.query(
            `SELECT id, name${extraSelect} FROM users
             WHERE roles @> ARRAY['artist']::TEXT[]
             ORDER BY name`
          );
      return NextResponse.json({ artists: serialize(rows) });
    } catch (error) {
      // Pre-014 schemas have no roles column: no identifiable artists.
      const code = (error as { code?: string })?.code;
      const message = String((error as { message?: string })?.message || "");
      if (code !== "42703" && !/column .* does not exist/i.test(message)) throw error;
      return NextResponse.json({ artists: [] });
    }
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
