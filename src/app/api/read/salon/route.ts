import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getSalonId } from "@/lib/multi-tenant";
import { normalizeOptimizerSettings } from "@/lib/salon-settings";

export async function GET() {
  try {
    const salonId = getSalonId();
    let rows;
    let hasSplashFields = true;
    let hasHybridFields = true;
    // SALON_ID may be a UUID (canonical) or a human-friendly slug/name from an
    // older deployment. Resolve by id OR slug so both configurations work.
    // Cast id to text so a non-UUID SALON_ID never raises 22P02 on the uuid
    // column comparison.
    const scopedWhere = salonId
      ? "(id::text = $1 OR slug = $1)"
      : null;
    const whereClause = scopedWhere ? `WHERE ${scopedWhere} LIMIT 1` : "LIMIT 1";
    try {
      const result = salonId
        ? await sql.query(
            `SELECT id, name, description, slogan, phone, address, hero_image_url, logo_url,
                    working_hours_text, working_hours, slot_buffer_minutes, slot_interval_minutes,
                    early_extra_hours, late_extra_hours, expand_threshold, proximity_window_hours,
                    allow_overflow, overflow_minutes, specific_days_off,
                    optimization_mode, suggestion_limit, min_useful_gap_minutes,
                    splash_title, splash_slogan, splash_logo_url
             FROM salons ${whereClause}`,
            [salonId]
          )
        : await sql`
            SELECT id, name, description, slogan, phone, address, hero_image_url, logo_url,
                   working_hours_text, working_hours, slot_buffer_minutes, slot_interval_minutes,
                   early_extra_hours, late_extra_hours, expand_threshold, proximity_window_hours,
                   allow_overflow, overflow_minutes, specific_days_off,
                   optimization_mode, suggestion_limit, min_useful_gap_minutes,
                   splash_title, splash_slogan, splash_logo_url
            FROM salon_info LIMIT 1
          `;
      rows = result.rows;
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const message = String((error as { message?: string })?.message || "");
      // Handle both missing-column errors (42703) and invalid-UUID lookups
      // (22P02 when SALON_ID is a slug against a uuid-typed id column).
      const isColumnError = code === "42703" || /column .* does not exist/i.test(message);
      const isUuidError = code === "22P02";
      if (!isColumnError && !isUuidError) throw error;
      // A deployment may be serving this build before migrations 011+ have been
      // applied, or SALON_ID may be a slug. Fall back to the base engine columns
      // and resolve the row by slug so the homepage still loads.
      hasSplashFields = false;
      try {
        const result = salonId
          ? await sql.query(
              `SELECT id, name, description, slogan, phone, address, hero_image_url, logo_url,
                      working_hours_text, working_hours, slot_buffer_minutes, slot_interval_minutes,
                      early_extra_hours, late_extra_hours, expand_threshold, proximity_window_hours,
                      allow_overflow, overflow_minutes, specific_days_off
               FROM salons ${whereClause}`,
              [salonId]
            )
          : await sql`
              SELECT id, name, description, slogan, phone, address, hero_image_url, logo_url,
                     working_hours_text, working_hours, slot_buffer_minutes, slot_interval_minutes,
                     early_extra_hours, late_extra_hours, expand_threshold, proximity_window_hours,
                     allow_overflow, overflow_minutes, specific_days_off
              FROM salon_info LIMIT 1
            `;
        rows = result.rows;
      } catch (baseError) {
        const baseCode = (baseError as { code?: string })?.code;
        const baseMessage = String((baseError as { message?: string })?.message || "");
        const isBaseColumnError = baseCode === "42703" || /column .* does not exist/i.test(baseMessage);
        const isBaseUuidError = baseCode === "22P02";
        if (!isBaseColumnError && !isBaseUuidError) throw baseError;
        // Even the base columns are missing (e.g. a DB stuck on the original
        // singleton schema). Try the smallest stable query before giving up.
        hasHybridFields = false;
        const result = salonId
          ? await sql.query(
              `SELECT id, name, description, slogan, phone, address, hero_image_url, logo_url,
                      working_hours_text, working_hours, specific_days_off
               FROM salons ${whereClause}`,
              [salonId]
            )
          : await sql`
              SELECT id, name, description, slogan, phone, address, hero_image_url, logo_url,
                     working_hours_text, working_hours, specific_days_off
              FROM salon_info LIMIT 1
            `;
        rows = result.rows;
      }
    }
    if (!rows[0]) return NextResponse.json(null);
    const s = rows[0];
    const optimizerSettings = hasHybridFields ? normalizeOptimizerSettings(s) : {
      optimization_mode: "hybrid" as const,
      suggestion_limit: 3,
      min_useful_gap_minutes: 30,
    };
    return NextResponse.json({
      id: s.id,
      name: s.name,
      description: s.description,
      slogan: s.slogan || "",
      phone: s.phone,
      address: s.address,
      hero_image_url: s.hero_image_url,
      logo_url: s.logo_url,
      splash_title: hasSplashFields ? (s.splash_title || "Forehand Nail") : "Forehand Nail",
      splash_slogan: hasSplashFields ? (s.splash_slogan || "Nail Art Studio") : "Nail Art Studio",
      splash_logo_url: hasSplashFields ? (s.splash_logo_url || null) : null,
      working_hours_text: s.working_hours_text || "شنبه تا پنج شنبه . ۱۰ تا ۱۸",
      working_hours: s.working_hours,
      slot_buffer_minutes: s.slot_buffer_minutes ?? 0,
      slot_interval_minutes: s.slot_interval_minutes ?? 15,
      early_extra_hours: s.early_extra_hours ?? 0,
      late_extra_hours: s.late_extra_hours ?? 0,
      expand_threshold: s.expand_threshold ?? 80,
      proximity_window_hours: s.proximity_window_hours ?? 2,
      allow_overflow: s.allow_overflow ?? false,
      overflow_minutes: s.overflow_minutes ?? 0,
      ...optimizerSettings,
      specific_days_off: s.specific_days_off,
    });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
