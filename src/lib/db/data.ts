import type { SalonInfo, Service, Booking, Addon, Highlight, HighlightImage } from "../mock-data";

// All reads go through API routes (Vercel Postgres is server-side only)

export async function fetchSalonInfo(): Promise<SalonInfo | null> {
  const res = await fetch("/api/read/salon");
  if (!res.ok) return null;
  return res.json();
}

export async function fetchServices(): Promise<Service[]> {
  const res = await fetch("/api/read/services");
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAddons(): Promise<Addon[]> {
  const res = await fetch("/api/read/addons");
  if (!res.ok) return [];
  return res.json();
}

export async function fetchBookings(): Promise<Booking[]> {
  const res = await fetch("/api/read/bookings", { credentials: "include" });
  if (!res.ok) return [];
  return res.json();
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
  const res = await fetch("/api/read/booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(booking),
  });
  const body = await res.json();
  if (!res.ok) {
    const details = body.debug ? ` (${JSON.stringify(body.debug)})` : "";
    throw new Error(body.error + details || "Failed to save booking");
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
