import { supabase } from "./client";
import type { SalonInfo, Service, Booking, Addon, Highlight, HighlightImage } from "../mock-data";

export async function fetchSalonInfo(): Promise<SalonInfo | null> {
  const { data } = await supabase.from("salon_info").select("*").limit(1).single();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    slogan: data.slogan || "",
    phone: data.phone,
    address: data.address,
    hero_image_url: data.hero_image_url,
    logo_url: data.logo_url,
    working_hours: data.working_hours,
    slot_buffer_minutes: data.slot_buffer_minutes,
    slot_interval_minutes: data.slot_interval_minutes,
  };
}

export async function updateSalonInfo(updates: Partial<SalonInfo>) {
  const { data: existing } = await supabase.from("salon_info").select("id").limit(1).single();
  if (existing) {
    await supabase.from("salon_info").update(updates).eq("id", existing.id);
  }
}

export async function fetchServices(): Promise<Service[]> {
  const { data } = await supabase.from("services").select("*").order("sort_order");
  return (data || []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    duration_minutes: s.duration_minutes,
    price: s.price,
    is_active: s.is_active,
    sort_order: s.sort_order,
    addon_ids: s.addon_ids || [],
  }));
}

export async function upsertService(service: Service) {
  await supabase.from("services").upsert({
    id: service.id,
    name: service.name,
    description: service.description,
    duration_minutes: service.duration_minutes,
    price: service.price,
    is_active: service.is_active,
    sort_order: service.sort_order,
    addon_ids: service.addon_ids,
  });
}

export async function deleteService(id: string) {
  await supabase.from("services").delete().eq("id", id);
}

export async function fetchAddons(): Promise<Addon[]> {
  const { data } = await supabase.from("addons").select("*").order("created_at");
  return (data || []).map((a) => ({
    id: a.id,
    name: a.name,
    price: a.price,
    duration_minutes: a.duration_minutes,
    is_active: a.is_active,
  }));
}

export async function upsertAddon(addon: Addon) {
  await supabase.from("addons").upsert({
    id: addon.id,
    name: addon.name,
    price: addon.price,
    duration_minutes: addon.duration_minutes,
    is_active: addon.is_active,
  });
}

export async function deleteAddon(id: string) {
  await supabase.from("addons").delete().eq("id", id);
}

export async function fetchBookings(): Promise<Booking[]> {
  const { data } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
  return (data || []).map((b) => ({
    id: b.id,
    service_id: b.service_id,
    selected_addons: b.selected_addons || [],
    customer_name: b.customer_name,
    customer_phone: b.customer_phone,
    date: b.date,
    date_gregorian: b.date_gregorian,
    start_time: b.start_time,
    end_time: b.end_time,
    status: b.status,
    phone_verified: b.phone_verified,
    paid: b.paid || false,
    created_at: b.created_at,
  }));
}

export async function insertBooking(booking: Booking) {
  await supabase.from("bookings").insert({
    id: booking.id,
    user_id: booking.user_id || null,
    service_id: booking.service_id,
    selected_addons: booking.selected_addons,
    customer_name: booking.customer_name,
    customer_phone: booking.customer_phone,
    date: booking.date,
    date_gregorian: booking.date_gregorian,
    start_time: booking.start_time,
    end_time: booking.end_time,
    status: booking.status,
    phone_verified: booking.phone_verified,
  });
}

export async function fetchWorkingHours() {
  const { data } = await supabase.from("salon_info").select("working_hours, specific_days_off").limit(1).single();
  return data;
}

export async function updateWorkingHours(workingHours: Record<string, unknown>, specificDaysOff: string[]) {
  const { data: existing } = await supabase.from("salon_info").select("id").limit(1).single();
  if (existing) {
    await supabase.from("salon_info").update({
      working_hours: workingHours,
      specific_days_off: specificDaysOff,
    }).eq("id", existing.id);
  }
}

// ── Highlights ──

export async function fetchHighlights(): Promise<Highlight[]> {
  const { data: highlights } = await supabase
    .from("highlights")
    .select("*")
    .order("sort_order");

  if (!highlights || highlights.length === 0) return [];

  const { data: images } = await supabase
    .from("highlight_images")
    .select("*")
    .order("sort_order");

  const imageMap = new Map<string, HighlightImage[]>();
  for (const img of images || []) {
    if (!imageMap.has(img.highlight_id)) imageMap.set(img.highlight_id, []);
    imageMap.get(img.highlight_id)!.push({
      id: img.id,
      highlight_id: img.highlight_id,
      image_url: img.image_url,
      caption: img.caption || "",
      sort_order: img.sort_order,
    });
  }

  return highlights.map((h) => ({
    id: h.id,
    name: h.name,
    cover_url: h.cover_url,
    sort_order: h.sort_order,
    images: imageMap.get(h.id) || [],
  }));
}

export async function upsertHighlight(highlight: Highlight) {
  await supabase.from("highlights").upsert({
    id: highlight.id,
    name: highlight.name,
    cover_url: highlight.cover_url,
    sort_order: highlight.sort_order,
  });
}

export async function deleteHighlight(id: string) {
  await supabase.from("highlights").delete().eq("id", id);
}

export async function upsertHighlightImage(image: HighlightImage) {
  await supabase.from("highlight_images").upsert({
    id: image.id,
    highlight_id: image.highlight_id,
    image_url: image.image_url,
    caption: image.caption,
    sort_order: image.sort_order,
  });
}

export async function deleteHighlightImage(id: string) {
  await supabase.from("highlight_images").delete().eq("id", id);
}

export async function uploadHighlightImage(file: File): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `highlights/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("highlights")
    .upload(path, file, { contentType: file.type });

  if (error) return null;

  const { data } = supabase.storage.from("highlights").getPublicUrl(path);
  return data?.publicUrl || null;
}
