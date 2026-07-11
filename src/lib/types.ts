export interface SalonInfo {
  id: string;
  name: string;
  description: string;
  slogan: string;
  phone: string;
  address: string;
  hero_image_url: string | null;
  logo_url: string | null;
  working_hours_text: string;
  working_hours: {
    [key: string]: { open: string; close: string } | null;
  };
  specific_days_off?: string[];
  slot_buffer_minutes: number;
  slot_interval_minutes: number;
  early_extra_hours: number;
  late_extra_hours: number;
  expand_threshold: number;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  sort_order: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  sort_order: number;
  addon_ids: string[];
  priority_score: number;
}

export interface Booking {
  id: string;
  user_id?: string;
  service_id: string;
  selected_addons: string[];
  customer_name: string;
  customer_phone: string;
  date: string;
  date_gregorian: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  phone_verified: boolean;
  paid: boolean;
  created_at: string;
  service?: Service;
}

export interface HighlightImage {
  id: string;
  highlight_id: string;
  image_url: string;
  caption: string;
  sort_order: number;
}

export interface Highlight {
  id: string;
  name: string;
  cover_url: string | null;
  sort_order: number;
  images: HighlightImage[];
}
