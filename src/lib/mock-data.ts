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
  slot_buffer_minutes: number;
  slot_interval_minutes: number;
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

export const MOCK_SALON: SalonInfo = {
  id: "1",
  name: "استدیو تخصصی ناخن فورهند",
  description: "Forehand Nail Studio — استدیو تخصصی ناخن در مشهد",
  slogan: "زیبایی ناخن، اعتماد به نفس شما",
  phone: "09308681363",
  address: "مشهد، نبش صارمی ۳۸/۱۲، پلاک ۷۷",
  hero_image_url: null,
  logo_url: null,
  working_hours_text: "شنبه تا پنج شنبه . ۱۰ تا ۱۸",
  working_hours: {
    sat: { open: "10:00", close: "16:00" },
    sun: { open: "10:00", close: "16:00" },
    mon: { open: "10:00", close: "16:00" },
    tue: { open: "10:00", close: "16:00" },
    wed: { open: "10:00", close: "16:00" },
    thu: { open: "10:00", close: "16:00" },
    fri: null,
  },
  slot_buffer_minutes: 15,
  slot_interval_minutes: 15,
};

export const MOCK_ADDONS: Addon[] = [
  { id: "a1", name: "طراحی ساده", price: 50000, duration_minutes: 10, is_active: true, sort_order: 1 },
  { id: "a2", name: "سنگ ناخن", price: 30000, duration_minutes: 5, is_active: true, sort_order: 2 },
  { id: "a3", name: "کروم ناخن", price: 40000, duration_minutes: 5, is_active: true, sort_order: 3 },
  { id: "a4", name: "فرنچ رنگی", price: 30000, duration_minutes: 5, is_active: true, sort_order: 4 },
  { id: "a5", name: "نگین فرنچ", price: 40000, duration_minutes: 10, is_active: true, sort_order: 5 },
  { id: "a6", name: "لاک ژل پا", price: 100000, duration_minutes: 15, is_active: true, sort_order: 6 },
];

export const MOCK_SERVICES: Service[] = [
  {
    id: "1",
    name: "ژلیش ناخن",
    description: "ماندگاری بالا و براقیت فوق‌العاده",
    duration_minutes: 45,
    price: 350000,
    is_active: true,
    sort_order: 1,
    addon_ids: ["a1", "a2", "a3"],
    priority_score: 7,
  },
  {
    id: "2",
    name: "فرنچ ناخن",
    description: "کلاسیک و شیک، مناسب هر موقعیت",
    duration_minutes: 60,
    price: 450000,
    is_active: true,
    sort_order: 2,
    addon_ids: ["a4", "a5"],
    priority_score: 8,
  },
  {
    id: "3",
    name: "طراحی ناخن",
    description: "طراحی سفارشی با بهترین مواد",
    duration_minutes: 90,
    price: 600000,
    is_active: true,
    sort_order: 3,
    addon_ids: [],
    priority_score: 10,
  },
  {
    id: "4",
    name: "پدیکور",
    description: "مراقبت کامل پا + لاک",
    duration_minutes: 60,
    price: 400000,
    is_active: true,
    sort_order: 4,
    addon_ids: ["a6"],
    priority_score: 6,
  },
  {
    id: "5",
    name: "ترمیم ناخن",
    description: "ترمیم و بازسازی ناخن آسیب‌دیده",
    duration_minutes: 45,
    price: 300000,
    is_active: true,
    sort_order: 5,
    addon_ids: [],
    priority_score: 5,
  },
];

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

export const MOCK_BOOKINGS: Booking[] = [];

export const MOCK_HIGHLIGHTS: Highlight[] = [];
