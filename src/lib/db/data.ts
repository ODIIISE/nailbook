import type { SalonInfo, Service, Booking, Addon, Highlight, HighlightImage } from "../types";

// All reads go through API routes (Vercel Postgres is server-side only)

// Postgres returns numeric columns as strings — normalize at the source
function normalizeService(s: Service): Service {
  return { ...s, price: Number(s.price), duration_minutes: Number(s.duration_minutes) };
}

function normalizeAddon(a: Addon): Addon {
  return { ...a, price: Number(a.price), duration_minutes: Number(a.duration_minutes) };
}

function normalizeBooking(b: Booking): Booking {
  return { ...b, paid: Boolean(b.paid) };
}

export async function fetchSalonInfo(): Promise<SalonInfo | null> {
  const res = await fetch("/api/read/salon");
  if (!res.ok) return null;
  return res.json();
}

export async function fetchServices(): Promise<Service[]> {
  const res = await fetch("/api/read/services");
  if (!res.ok) return [];
  const data: Service[] = await res.json();
  return data.map(normalizeService);
}

export async function fetchAddons(): Promise<Addon[]> {
  const res = await fetch("/api/read/addons");
  if (!res.ok) return [];
  const data: Addon[] = await res.json();
  return data.map(normalizeAddon);
}

export async function fetchBookings(): Promise<Booking[]> {
  const res = await fetch("/api/read/bookings", { credentials: "include" });
  if (!res.ok) return [];
  const data: Booking[] = await res.json();
  return data.map(normalizeBooking);
}

export async function fetchHighlights(): Promise<Highlight[]> {
  const res = await fetch("/api/read/highlights");
  if (!res.ok) return [];
  return res.json();
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

export async function insertBooking(booking: Booking) {
  const res = await fetch("/api/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: booking.customer_phone,
      service_id: booking.service_id,
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
}

export async function cancelBooking(bookingId: string) {
  const res = await fetch(`/api/bookings/${bookingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || "Failed to cancel booking");
  }
}

export async function fetchWorkingHours() {
  const res = await fetch("/api/read/salon");
  if (!res.ok) return null;
  const data = await res.json();
  return data ? { working_hours: data.working_hours, specific_days_off: data.specific_days_off } : null;
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
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload-highlight", { method: "POST", body: formData });
  if (!res.ok) return null;
  const data = await res.json();
  return data.url || null;
}
