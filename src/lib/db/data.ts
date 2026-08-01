import type { SalonInfo, Service, Booking, Addon, Highlight, HighlightImage } from "../types";

// All reads go through API routes (Vercel Postgres is server-side only)

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function finiteNumber(value: unknown, fallback = 0): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeTextArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  if (typeof value === "string") {
    return value
      .replace(/^\{|\}$/g, "")
      .split(",")
      .map((item) => item.replace(/^"|"$/g, "").trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value.toLowerCase() === "true" || value === "1";
  return false;
}

// Postgres returns numeric columns as strings — normalize at the source.
function normalizeService(value: unknown): Service | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") return null;
  return {
    id: value.id,
    name: value.name,
    description: typeof value.description === "string" ? value.description : "",
    price: finiteNumber(value.price),
    duration_minutes: finiteNumber(value.duration_minutes),
    is_active: value.is_active !== false,
    sort_order: finiteNumber(value.sort_order),
    addon_ids: normalizeTextArray(value.addon_ids),
    priority_score: finiteNumber(value.priority_score, 5),
    image_url: typeof value.image_url === "string" && value.image_url.length > 0 ? value.image_url : null,
    best_for: normalizeTextArray(value.best_for),
  };
}

function normalizeAddon(value: unknown): Addon | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") return null;
  return {
    id: value.id,
    name: value.name,
    price: finiteNumber(value.price),
    duration_minutes: finiteNumber(value.duration_minutes),
    is_active: value.is_active !== false,
    sort_order: finiteNumber(value.sort_order),
    hint: typeof value.hint === "string" ? value.hint : undefined,
  };
}

function normalizeDateKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const dateKey = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) return null;
  return dateKey;
}

function normalizeTime(value: unknown): string {
  if (typeof value !== "string") return "00:00";
  const match = /^(?:[01]\d|2[0-3]):[0-5]\d/.exec(value);
  return match ? match[0] : "00:00";
}

function normalizeBooking(value: unknown): Booking | null {
  if (!isRecord(value)) return null;
  const dateGregorian = normalizeDateKey(value.date_gregorian);
  // A booking without a canonical date cannot be safely grouped or displayed.
  // Drop it here rather than letting a malformed database row crash the page's
  // Jalali conversion during render.
  if (!dateGregorian) return null;
  const validStatuses = ["pending", "reserved", "confirmed", "in_progress", "completed", "cancelled"] as const;
  const status = validStatuses.includes(value.status as (typeof validStatuses)[number])
    ? (value.status as Booking["status"])
    : "pending";
  const id = typeof value.id === "string"
    ? value.id
    : `availability-${dateGregorian}-${normalizeTime(value.start_time)}-${normalizeTime(value.end_time)}`;
  return {
    id,
    user_id: typeof value.user_id === "string" ? value.user_id : undefined,
    // Public availability rows intentionally omit service_id and other
    // private fields; the booking calendar only needs their time block.
    service_id: typeof value.service_id === "string" ? value.service_id : "",
    selected_addons: normalizeTextArray(value.selected_addons),
    customer_name: typeof value.customer_name === "string" ? value.customer_name : "",
    customer_phone: typeof value.customer_phone === "string" ? value.customer_phone : "",
    date: typeof value.date === "string" ? value.date : "",
    date_gregorian: dateGregorian,
    start_time: normalizeTime(value.start_time),
    end_time: normalizeTime(value.end_time),
    status,
    phone_verified: normalizeBoolean(value.phone_verified),
    paid: normalizeBoolean(value.paid),
    created_at: typeof value.created_at === "string" ? value.created_at : "",
  };
}

function normalizeHighlight(value: unknown): Highlight | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") return null;
  const images = Array.isArray(value.images)
    ? value.images.filter(isRecord).flatMap((image): HighlightImage[] => {
        if (typeof image.id !== "string" || typeof image.highlight_id !== "string" || typeof image.image_url !== "string") return [];
        return [{
          id: image.id,
          highlight_id: image.highlight_id,
          image_url: image.image_url,
          caption: typeof image.caption === "string" ? image.caption : "",
          sort_order: finiteNumber(image.sort_order),
        }];
      })
    : [];
  return {
    id: value.id,
    name: value.name,
    cover_url: typeof value.cover_url === "string" ? value.cover_url : null,
    sort_order: finiteNumber(value.sort_order),
    service_id: typeof value.service_id === "string" ? value.service_id : null,
    images,
  };
}

function normalizeSalon(value: unknown): SalonInfo | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  return {
    id: value.id,
    name: typeof value.name === "string" ? value.name : "",
    description: typeof value.description === "string" ? value.description : "",
    slogan: typeof value.slogan === "string" ? value.slogan : "",
    phone: typeof value.phone === "string" ? value.phone : "",
    address: typeof value.address === "string" ? value.address : "",
    hero_image_url: typeof value.hero_image_url === "string" ? value.hero_image_url : null,
    logo_url: typeof value.logo_url === "string" ? value.logo_url : null,
    splash_title: typeof value.splash_title === "string" ? value.splash_title : "Forehand Nail",
    splash_slogan: typeof value.splash_slogan === "string" ? value.splash_slogan : "Nail Art Studio",
    splash_logo_url: typeof value.splash_logo_url === "string" ? value.splash_logo_url : null,
    working_hours_text: typeof value.working_hours_text === "string" ? value.working_hours_text : "",
    working_hours: isRecord(value.working_hours)
      ? value.working_hours as SalonInfo["working_hours"]
      : {},
    slot_buffer_minutes: finiteNumber(value.slot_buffer_minutes),
    slot_interval_minutes: finiteNumber(value.slot_interval_minutes, 15),
    early_extra_hours: finiteNumber(value.early_extra_hours),
    late_extra_hours: finiteNumber(value.late_extra_hours),
    expand_threshold: finiteNumber(value.expand_threshold, 80),
    proximity_window_hours: finiteNumber(value.proximity_window_hours, 2),
    allow_overflow: normalizeBoolean(value.allow_overflow),
    overflow_minutes: finiteNumber(value.overflow_minutes),
    specific_days_off: Array.isArray(value.specific_days_off)
      ? value.specific_days_off.filter((day): day is string => typeof day === "string")
      : [],
  };
}

export async function fetchSalonInfo(): Promise<SalonInfo | null> {
  try {
    const res = await fetch("/api/read/salon");
    if (!res.ok) return null;
    return normalizeSalon(await readJson(res));
  } catch {
    return null;
  }
}

export async function fetchServices(): Promise<Service[]> {
  try {
    const res = await fetch("/api/read/services");
    if (!res.ok) return [];
    const data = await readJson(res);
    return Array.isArray(data) ? data.map(normalizeService).filter((item): item is Service => item !== null) : [];
  } catch {
    return [];
  }
}

export async function fetchAddons(): Promise<Addon[]> {
  try {
    const res = await fetch("/api/read/addons");
    if (!res.ok) return [];
    const data = await readJson(res);
    return Array.isArray(data) ? data.map(normalizeAddon).filter((item): item is Addon => item !== null) : [];
  } catch {
    return [];
  }
}

export async function fetchBookings(scope: "owner" | "default" = "default"): Promise<Booking[] | null> {
  try {
    const endpoint = scope === "owner" ? "/api/read/bookings?scope=owner" : "/api/read/bookings";
    const res = await fetch(endpoint, { credentials: "include" });
    if (!res.ok) return null;
    const data = await readJson(res);
    if (!Array.isArray(data)) return null;
    return data.map(normalizeBooking).filter((item): item is Booking => item !== null);
  } catch {
    return null;
  }
}

export async function fetchHighlights(): Promise<Highlight[]> {
  try {
    const res = await fetch("/api/read/highlights");
    if (!res.ok) return [];
    const data = await readJson(res);
    return Array.isArray(data) ? data.map(normalizeHighlight).filter((item): item is Highlight => item !== null) : [];
  } catch {
    return [];
  }
}

export async function saveServices(services: Service[]) {
  const res = await fetch("/api/owner/services", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ services }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Failed to save services");
}

export async function saveAddons(addons: Addon[]) {
  const res = await fetch("/api/owner/addons", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addons }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Failed to save addons");
}

export async function insertBooking(booking: Booking): Promise<{ id: string; start_time: string; end_time: string }> {
  const res = await fetch("/api/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: booking.customer_phone,
      service_id: booking.service_id,
      date: booking.date,
      date_gregorian: booking.date_gregorian,
      start_time: booking.start_time,
      end_time: booking.end_time,
      customer_name: booking.customer_name,
      selected_addons: booking.selected_addons,
      user_id: booking.user_id,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || "Failed to save booking");
  }
  return { id: body.booking_id, start_time: body.start_time, end_time: body.end_time };
}

/** Owner manual booking — uses /api/owner/bookings which skips strict customer validation */
export async function insertOwnerBooking(booking: Booking): Promise<{ id: string; start_time: string; end_time: string }> {
  const res = await fetch("/api/owner/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      customer_phone: booking.customer_phone,
      customer_name: booking.customer_name,
      service_id: booking.service_id,
      date: booking.date,
      date_gregorian: booking.date_gregorian,
      start_time: booking.start_time,
      end_time: booking.end_time,
      selected_addons: booking.selected_addons,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || "Failed to save booking");
  }
  return { id: body.booking_id, start_time: body.start_time, end_time: body.end_time };
}

export async function cancelBooking(bookingId: string) {
  const res = await fetch(`/api/bookings/${bookingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to cancel booking");
  }
}

export async function fetchWorkingHours() {
  try {
    const res = await fetch("/api/read/salon");
    if (!res.ok) return null;
    const data = await readJson(res);
    if (!isRecord(data) || !isRecord(data.working_hours)) return null;
    return {
      working_hours: data.working_hours as Record<string, { open: string; close: string } | null>,
      specific_days_off: Array.isArray(data.specific_days_off)
        ? data.specific_days_off.filter((day): day is string => typeof day === "string")
        : [],
    };
  } catch {
    return null;
  }
}

export async function updateWorkingHours(workingHours: Record<string, unknown>, specificDaysOff: string[]) {
  const res = await fetch("/api/update-salon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ working_hours: workingHours, specific_days_off: specificDaysOff }),
  });
  if (!res.ok) throw new Error("Failed to update working hours");
}

export async function upsertHighlight(highlight: Highlight) {
  const res = await fetch("/api/read/highlights", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(highlight),
  });
  if (!res.ok) throw new Error("Failed to save highlight");
}

export async function deleteHighlight(id: string) {
  const res = await fetch(`/api/read/highlights?id=${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete highlight");
}

export async function upsertHighlightImage(image: HighlightImage) {
  const res = await fetch("/api/read/highlight-images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(image),
  });
  if (!res.ok) throw new Error("Failed to save highlight image");
}

export async function deleteHighlightImage(id: string) {
  const res = await fetch(`/api/read/highlight-images?id=${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete highlight image");
}

export async function uploadHighlightImage(file: File): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload-highlight", { method: "POST", body: formData });
    if (!res.ok) return null;
    const data = await readJson(res);
    return isRecord(data) && typeof data.url === "string" ? data.url : null;
  } catch {
    return null;
  }
}
