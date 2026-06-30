export interface SalonInfo {
  id: string;
  name: string;
  description: string;
  phone: string;
  address: string;
  hero_image_url: string | null;
  logo_url: string | null;
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
}

export interface Booking {
  id: string;
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
  created_at: string;
  service?: Service;
}

export interface SoftLock {
  id: string;
  service_id: string;
  date_gregorian: string;
  start_time: string;
  locked_by_phone: string;
  locked_at: string;
  expires_at: string;
  released: boolean;
}

export const MOCK_SALON: SalonInfo = {
  id: "1",
  name: "ناخن‌های سوفی",
  description: "استودیوی تخصصی ناخن با بیش از ۵ سال تجربه در ارائه بهترین خدمات ناخن",
  phone: "09121234567",
  address: "خیابان ولیعصر، نبش کوچه گل، پلاک ۱۲، تهران",
  hero_image_url: null,
  logo_url: null,
  working_hours: {
    sat: { open: "10:00", close: "18:00" },
    sun: { open: "10:00", close: "18:00" },
    mon: { open: "10:00", close: "18:00" },
    tue: { open: "10:00", close: "18:00" },
    wed: { open: "10:00", close: "18:00" },
    thu: null,
    fri: null,
  },
  slot_buffer_minutes: 15,
  slot_interval_minutes: 30,
};

export const MOCK_ADDONS: Addon[] = [
  { id: "a1", name: "طراحی ساده", price: 50000, duration_minutes: 10, is_active: true },
  { id: "a2", name: "سنگ ناخن", price: 30000, duration_minutes: 5, is_active: true },
  { id: "a3", name: "کروم ناخن", price: 40000, duration_minutes: 5, is_active: true },
  { id: "a4", name: "فرنچ رنگی", price: 30000, duration_minutes: 5, is_active: true },
  { id: "a5", name: "نگین فرنچ", price: 40000, duration_minutes: 10, is_active: true },
  { id: "a6", name: "لاک ژل پا", price: 100000, duration_minutes: 15, is_active: true },
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
  },
];

const today = new Date().toISOString().split("T")[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: "b1",
    service_id: "1",
    selected_addons: [],
    customer_name: "سارا کریمی",
    customer_phone: "09121111111",
    date: "1404-04-05",
    date_gregorian: today,
    start_time: "09:00",
    end_time: "09:45",
    status: "confirmed",
    phone_verified: true,
    created_at: "2025-06-20T10:00:00Z",
  },
  {
    id: "b2",
    service_id: "2",
    selected_addons: [],
    customer_name: "مایا رضایی",
    customer_phone: "09122222222",
    date: "1404-04-05",
    date_gregorian: today,
    start_time: "10:00",
    end_time: "11:00",
    status: "confirmed",
    phone_verified: true,
    created_at: "2025-06-20T11:00:00Z",
  },
  {
    id: "b3",
    service_id: "3",
    selected_addons: [],
    customer_name: "نیلوفر عباسی",
    customer_phone: "09123333333",
    date: "1404-04-05",
    date_gregorian: today,
    start_time: "11:30",
    end_time: "13:00",
    status: "confirmed",
    phone_verified: true,
    created_at: "2025-06-21T14:00:00Z",
  },
  {
    id: "b4",
    service_id: "4",
    selected_addons: [],
    customer_name: "الناز محمدی",
    customer_phone: "09124444444",
    date: "1404-04-06",
    date_gregorian: tomorrow,
    start_time: "10:00",
    end_time: "11:00",
    status: "confirmed",
    phone_verified: true,
    created_at: "2025-06-22T10:00:00Z",
  },
  {
    id: "b5",
    service_id: "5",
    selected_addons: [],
    customer_name: "زهرا حسینی",
    customer_phone: "09125555555",
    date: "1404-04-06",
    date_gregorian: tomorrow,
    start_time: "14:00",
    end_time: "14:45",
    status: "confirmed",
    phone_verified: true,
    created_at: "2025-06-22T14:00:00Z",
  },
];

export const MOCK_TOTAL_BOOKINGS = 527;
