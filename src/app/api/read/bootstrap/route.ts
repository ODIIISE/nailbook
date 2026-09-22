import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getSalonId, resolveSalonId } from "@/lib/multi-tenant";
import { normalizeOptimizerSettings } from "@/lib/salon-settings";

/**
 * Consolidated initial payload — /api/read/bootstrap?scope=home|all
 *
 * The client previously fired six parallel API routes on first paint; each was
 * its own serverless invocation + DB connection, so the page waited on the
 * slowest of six (measured 4s+ cold). This route composes the same payloads
 * server-side in one invocation. Per-section failures degrade independently:
 * a failed section is returned as null and the client falls back to the
 * individual endpoint it replaced.
 *
 * scope=home  → salon + services + addons + highlights. Public data → CDN
 *               cached (s-maxage=60, stale-while-revalidate=300).
 * scope=all   → additionally blockedTimes + the /api/read/bookings payload
 *               (session-aware). Never cached: bookings are user-scoped.
 */

export const runtime = "nodejs";

function isMissingColumnOrUuid(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  const message = String((error as { message?: string })?.message || "");
  return (
    code === "42703" ||
    code === "22P02" ||
    /column .* does not exist/i.test(message)
  );
}

/* ---------------- salon (mirrors /api/read/salon verbatim) ---------------- */

type SalonLoad = {
  row: Record<string, unknown> | null;
  hasSplashFields: boolean;
  hasHybridFields: boolean;
};

async function loadSalon(): Promise<SalonLoad> {
  const salonId = getSalonId();
  let hasSplashFields = true;
  let hasHybridFields = true;
  // SALON_ID may be a UUID (canonical) or a human-friendly slug/name from an
  // older deployment. Resolve by id OR slug so both configurations work.
  // Cast id to text so a non-UUID SALON_ID never raises 22P02 on the uuid
  // column comparison.
  const scopedWhere = salonId ? "(id::text = $1 OR slug = $1)" : null;
  const whereClause = scopedWhere ? `WHERE ${scopedWhere} LIMIT 1` : "LIMIT 1";
  try {
    const result = salonId
      ? await sql.query(
          `SELECT id, name, description, slogan, phone, address, city, instagram_handle, portrait_image_url, hero_image_url, logo_url,
                  working_hours_text, working_hours, slot_buffer_minutes, slot_interval_minutes,
                  early_extra_hours, late_extra_hours, expand_threshold, proximity_window_hours,
                  allow_overflow, overflow_minutes, specific_days_off,
                  optimization_mode, suggestion_limit, min_useful_gap_minutes,
                  splash_title, splash_slogan, splash_logo_url,
                  homepage_kicker, homepage_cta_label, homepage_micro, lookbook_title, booking_success_title
           FROM salons ${whereClause}`,
          [salonId]
        )
      : await sql`
          SELECT id, name, description, slogan, phone, address, city, instagram_handle, portrait_image_url, hero_image_url, logo_url,
                 working_hours_text, working_hours, slot_buffer_minutes, slot_interval_minutes,
                 early_extra_hours, late_extra_hours, expand_threshold, proximity_window_hours,
                 allow_overflow, overflow_minutes, specific_days_off,
                 optimization_mode, suggestion_limit, min_useful_gap_minutes,
                 splash_title, splash_slogan, splash_logo_url,
                 homepage_kicker, homepage_cta_label, homepage_micro, lookbook_title, booking_success_title
          FROM salon_info LIMIT 1
        `;
    return { row: result.rows[0] ?? null, hasSplashFields, hasHybridFields };
  } catch (error) {
    if (!isMissingColumnOrUuid(error)) {
      return { row: null, hasSplashFields, hasHybridFields };
    }
    // A deployment may be serving this build before migrations 011+ have been
    // applied, or SALON_ID may be a slug. Fall back to the base engine columns
    // and resolve the row by slug so the homepage still loads.
    hasSplashFields = false;
    try {
      const result = salonId
        ? await sql.query(
            `SELECT id, name, description, slogan, phone, address, portrait_image_url, hero_image_url, logo_url,
                    working_hours_text, working_hours, slot_buffer_minutes, slot_interval_minutes,
                    early_extra_hours, late_extra_hours, expand_threshold, proximity_window_hours,
                    allow_overflow, overflow_minutes, specific_days_off
             FROM salons ${whereClause}`,
            [salonId]
          )
        : await sql`
            SELECT id, name, description, slogan, phone, address, portrait_image_url, hero_image_url, logo_url,
                   working_hours_text, working_hours, slot_buffer_minutes, slot_interval_minutes,
                   early_extra_hours, late_extra_hours, expand_threshold, proximity_window_hours,
                   allow_overflow, overflow_minutes, specific_days_off
            FROM salon_info LIMIT 1
          `;
      return { row: result.rows[0] ?? null, hasSplashFields, hasHybridFields };
    } catch (baseError) {
      if (!isMissingColumnOrUuid(baseError)) {
        return { row: null, hasSplashFields, hasHybridFields };
      }
      // Even the base columns are missing (e.g. a DB stuck on the original
      // singleton schema). Try the smallest stable query before giving up.
      hasHybridFields = false;
      try {
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
        return { row: result.rows[0] ?? null, hasSplashFields, hasHybridFields };
      } catch {
        return { row: null, hasSplashFields, hasHybridFields };
      }
    }
  }
}

async function loadHomeGallery(salonId: string | null): Promise<Array<string | null>> {
  // Homepage gallery (migration 023) — fetched separately so deployments
  // that have not run the migration yet still load the salon fine.
  try {
    const g = salonId
      ? await sql.query("SELECT home_gallery_urls FROM salons WHERE id::text = $1 OR slug = $1 LIMIT 1", [salonId])
      : await sql`SELECT home_gallery_urls FROM salon_info LIMIT 1`;
    const raw = g.rows[0]?.home_gallery_urls;
    if (Array.isArray(raw)) {
      return raw.slice(0, 3).map((u) => (typeof u === "string" && u ? u : null));
    }
  } catch {
    /* column not migrated yet — keep empty */
  }
  return [];
}

function composeSalon(load: SalonLoad, homeGalleryUrls: Array<string | null>): Record<string, unknown> | null {
  const s = load.row;
  if (!s) return null;
  const optimizerSettings = load.hasHybridFields
    ? normalizeOptimizerSettings(s)
    : {
        optimization_mode: "hybrid" as const,
        suggestion_limit: 3,
        min_useful_gap_minutes: 30,
      };
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    slogan: s.slogan || "",
    phone: s.phone,
    address: s.address,
    city: s.city || "",
    instagram_handle: s.instagram_handle || "",
    portrait_image_url: s.portrait_image_url || null,
    hero_image_url: s.hero_image_url,
    home_gallery_urls: homeGalleryUrls,
    logo_url: s.logo_url,
    splash_title: load.hasSplashFields ? (s.splash_title || "Forehand Nail") : "Forehand Nail",
    splash_slogan: load.hasSplashFields ? (s.splash_slogan || "Nail Art Studio") : "Nail Art Studio",
    splash_logo_url: load.hasSplashFields ? (s.splash_logo_url || null) : null,
    homepage_kicker: s.homepage_kicker || "NAIL · CARE · RITUAL",
    homepage_cta_label: s.homepage_cta_label || "شروع رزرو",
    homepage_micro: s.homepage_micro || "بدون تماس تلفنی · زمان‌های آزاد همین‌جا",
    lookbook_title: s.lookbook_title || "نمونه‌کارها",
    booking_success_title: s.booking_success_title || "به‌زودی می‌بینیمت!",
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
  };
}

/* -------------- services (mirrors /api/read/services verbatim) -------------- */

function normalizeTextArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return [];
  return value
    .replace(/^\{|\}$/g, "")
    .split(",")
    .map((item) => item.replace(/^"|"$/g, "").trim())
    .filter(Boolean);
}

function serializeServices(rows: Array<Record<string, unknown>>) {
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    duration_minutes: Number(s.duration_minutes),
    price: Number(s.price),
    is_active: s.is_active,
    sort_order: s.sort_order,
    addon_ids: normalizeTextArray(s.addon_ids),
    priority_score: Number(s.priority_score) || 5,
    image_url: typeof s.image_url === "string" && s.image_url.length > 0 ? s.image_url : null,
    best_for: normalizeTextArray(s.best_for),
    icon_key: typeof s.icon_key === "string" && s.icon_key.length > 0 ? s.icon_key : null,
    is_popular: s.is_popular === true,
  }));
}

async function loadServices(): Promise<unknown[] | null> {
  try {
    const salonId = await resolveSalonId();
    const scoped = salonId
      ? sql`SELECT id, name, description, duration_minutes, price, is_active, sort_order, addon_ids, priority_score, image_url, best_for, icon_key, is_popular
           FROM services WHERE salon_id = ${salonId} ORDER BY sort_order`
      : sql`SELECT id, name, description, duration_minutes, price, is_active, sort_order, addon_ids, priority_score, image_url, best_for, icon_key, is_popular
           FROM services ORDER BY sort_order`;
    const { rows } = await scoped;
    return serializeServices(rows);
  } catch {
    return null;
  }
}

/* ---------------- addons (mirrors /api/read/addons verbatim) ---------------- */

async function loadAddons(): Promise<unknown[] | null> {
  try {
    const salonId = await resolveSalonId();
    const { rows } = salonId
      ? await sql.query(
          `SELECT id, name, price, duration_minutes, is_active, sort_order
           FROM addons WHERE salon_id = $1 ORDER BY sort_order`,
          [salonId]
        )
      : await sql`
          SELECT id, name, price, duration_minutes, is_active, sort_order
          FROM addons ORDER BY sort_order
        `;
    return rows.map((a) => ({
      id: a.id,
      name: a.name,
      price: Number(a.price),
      duration_minutes: Number(a.duration_minutes),
      is_active: a.is_active,
      sort_order: a.sort_order || 0,
    }));
  } catch {
    return null;
  }
}

/* ------------- highlights (mirrors /api/read/highlights GET) ------------- */

const HIGHLIGHT_COLUMNS = "id, name, cover_url, sort_order, service_id, addon_ids";

function serializeHighlight(h: Record<string, unknown>) {
  return {
    id: h.id,
    name: h.name,
    cover_url: typeof h.cover_url === "string" && h.cover_url.length > 0 ? h.cover_url : null,
    sort_order: Number(h.sort_order) || 0,
    service_id: typeof h.service_id === "string" && h.service_id.length > 0 ? h.service_id : null,
    addon_ids: normalizeTextArray(h.addon_ids),
  };
}

async function loadHighlights(): Promise<unknown[] | null> {
  try {
    const salonId = await resolveSalonId();
    const highlightsResult = salonId
      ? await sql.query(`SELECT ${HIGHLIGHT_COLUMNS} FROM highlights WHERE salon_id = $1 ORDER BY sort_order, id`, [salonId])
      : await sql.query(`SELECT ${HIGHLIGHT_COLUMNS} FROM highlights ORDER BY sort_order, id`);
    const imagesResult = salonId
      ? await sql.query("SELECT id, highlight_id, image_url, caption, sort_order FROM highlight_images WHERE salon_id = $1 ORDER BY sort_order, id", [salonId])
      : await sql`SELECT id, highlight_id, image_url, caption, sort_order FROM highlight_images ORDER BY sort_order, id`;
    const imageMap = new Map<string, unknown[]>();
    for (const img of imagesResult.rows) {
      if (!imageMap.has(img.highlight_id)) imageMap.set(img.highlight_id, []);
      imageMap.get(img.highlight_id)!.push({
        id: img.id,
        highlight_id: img.highlight_id,
        image_url: img.image_url,
        caption: img.caption || "",
        sort_order: img.sort_order,
      });
    }
    return highlightsResult.rows.map((h) => ({
      ...serializeHighlight(h),
      images: imageMap.get(h.id) || [],
    }));
  } catch {
    // Migration-fallback path of the original route collapses to null here;
    // the client falls back to /api/read/highlights which keeps its own
    // column-fallback logic for pre-migration deployments.
    return null;
  }
}

/* ------------ bookings + blocked times (scope=all only) ------------ */

async function loadBookings(request: NextRequest): Promise<unknown[] | null> {
  try {
    const { readBookingsPayload } = await import("@/lib/db/bookings-read");
    const res = await readBookingsPayload(request);
    if (!res.ok) return null;
    return (await res.json()) as unknown[];
  } catch {
    return null;
  }
}

async function loadBlockedTimes(): Promise<Array<Record<string, unknown>> | null> {
  try {
    const salonId = await resolveSalonId();
    const { rows } = salonId
      ? await sql.query(
          `SELECT date_gregorian, start_time, end_time
           FROM blocked_times WHERE salon_id = $1 ORDER BY date_gregorian`,
          [salonId]
        )
      : await sql`SELECT date_gregorian, start_time, end_time FROM blocked_times ORDER BY date_gregorian`;
    return rows;
  } catch {
    return null;
  }
}

/* ------------------------------- handler ------------------------------- */

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") === "all" ? "all" : "home";

  const [salonLoad, services, addons, highlights] = await Promise.all([
    loadSalon(),
    loadServices(),
    loadAddons(),
    loadHighlights(),
  ]);

  const salon = composeSalon(salonLoad, salonLoad.row ? await loadHomeGallery(getSalonId()) : []);

  const payload: Record<string, unknown> = { salon, services, addons, highlights };

  if (scope === "all") {
    const [bookings, blockedTimes] = await Promise.all([loadBookings(request), loadBlockedTimes()]);
    payload.bookings = bookings;
    payload.blockedTimes = blockedTimes;
  }

  const res = NextResponse.json(payload);
  if (scope === "home") {
    // Public catalog data — safe to cache at the CDN edge. scope=all embeds
    // session-scoped bookings and must never be cached.
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  } else {
    res.headers.set("Cache-Control", "private, no-store");
  }
  return res;
}
