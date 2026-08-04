import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getSalonId } from "@/lib/multi-tenant";

function normalizeTextArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return [];
  return value
    .replace(/^\{|\}$/g, "")
    .split(",")
    .map((item) => item.replace(/^"|"$/g, "").trim())
    .filter(Boolean);
}

function isMissingColumn(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  const message = String((error as { message?: string })?.message || "");
  return code === "42703" || /column .* does not exist/i.test(message);
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
  }));
}

export async function GET() {
  try {
    const salonId = getSalonId();
    const scoped = salonId
      ? sql`SELECT id, name, description, duration_minutes, price, is_active, sort_order, addon_ids, priority_score, image_url, best_for
           FROM services WHERE salon_id = ${salonId} ORDER BY sort_order`
      : sql`SELECT id, name, description, duration_minutes, price, is_active, sort_order, addon_ids, priority_score, image_url, best_for
           FROM services ORDER BY sort_order`;
    try {
      const { rows } = await scoped;
      return NextResponse.json(serializeServices(rows));
    } catch (error) {
      // A deployment may be serving the new UI before migration 015 has been
      // applied. Keep booking/service selection available with the base schema;
      // the next migration adds the richer fields.
      if (!isMissingColumn(error)) throw error;
      const { rows } = salonId
        ? await sql`SELECT id, name, description, duration_minutes, price, is_active, sort_order, addon_ids, priority_score
                    FROM services WHERE salon_id = ${salonId} ORDER BY sort_order`
        : await sql`SELECT id, name, description, duration_minutes, price, is_active, sort_order, addon_ids, priority_score
                    FROM services ORDER BY sort_order`;
      return NextResponse.json(serializeServices(rows));
    }
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
