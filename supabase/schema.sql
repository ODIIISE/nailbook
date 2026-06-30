-- NailBook Database Schema
-- Run this in Supabase SQL Editor

-- Salon info (single row for MVP)
CREATE TABLE IF NOT EXISTS salon_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'ناخن‌های سوفی',
  description TEXT DEFAULT 'استودیوی تخصصی ناخن',
  phone TEXT DEFAULT '09121234567',
  address TEXT DEFAULT 'خیابان ولیعصر، تهران',
  hero_image_url TEXT,
  logo_url TEXT,
  working_hours JSONB DEFAULT '{
    "sat": {"open": "10:00", "close": "18:00"},
    "sun": {"open": "10:00", "close": "18:00"},
    "mon": {"open": "10:00", "close": "18:00"},
    "tue": {"open": "10:00", "close": "18:00"},
    "wed": {"open": "10:00", "close": "18:00"},
    "thu": null,
    "fri": null
  }'::jsonb,
  specific_days_off JSONB DEFAULT '[]'::jsonb,
  slot_buffer_minutes INT DEFAULT 15,
  slot_interval_minutes INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Addons (standalone list)
CREATE TABLE IF NOT EXISTS addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  duration_minutes INT NOT NULL DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL DEFAULT 45,
  price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  addon_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id),
  selected_addons JSONB DEFAULT '[]'::jsonb,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  date TEXT NOT NULL,
  date_gregorian DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  phone_verified BOOLEAN DEFAULT false,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Soft locks for race condition prevention
CREATE TABLE IF NOT EXISTS soft_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id),
  date_gregorian DATE NOT NULL,
  start_time TIME NOT NULL,
  locked_by_phone TEXT NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  released BOOLEAN DEFAULT false
);

-- Verification codes (mock OTP)
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date_gregorian);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(customer_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_soft_locks_date ON soft_locks(date_gregorian);
CREATE INDEX IF NOT EXISTS idx_soft_locks_active ON soft_locks(released, expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_phone ON verification_codes(phone);

-- Seed salon info
INSERT INTO salon_info (name, description, phone, address) VALUES
  ('ناخن‌های سوفی', 'استودیوی تخصصی ناخن با بیش از ۵ سال تجربه در ارائه بهترین خدمات ناخن', '09121234567', 'خیابان ولیعصر، نبش کوچه گل، پلاک ۱۲، تهران')
ON CONFLICT DO NOTHING;

-- Seed addons
INSERT INTO addons (id, name, price, duration_minutes, is_active) VALUES
  ('a1', 'طراحی ساده', 50000, 10, true),
  ('a2', 'سنگ ناخن', 30000, 5, true),
  ('a3', 'کروم ناخن', 40000, 5, true),
  ('a4', 'فرنچ رنگی', 30000, 5, true),
  ('a5', 'نگین فرنچ', 40000, 10, true),
  ('a6', 'لاک ژل پا', 100000, 15, true)
ON CONFLICT DO NOTHING;

-- Seed services
INSERT INTO services (id, name, description, duration_minutes, price, sort_order, addon_ids) VALUES
  ('1', 'ژلیش ناخن', 'ماندگاری بالا و براقیت فوق‌العاده', 45, 350000, 1, '["a1","a2","a3"]'::jsonb),
  ('2', 'فرنچ ناخن', 'کلاسیک و شیک، مناسب هر موقعیت', 60, 450000, 2, '["a4","a5"]'::jsonb),
  ('3', 'طراحی ناخن', 'طراحی سفارشی با بهترین مواد', 90, 600000, 3, '[]'::jsonb),
  ('4', 'پدیکور', 'مراقبت کامل پا + لاک', 60, 400000, 4, '["a6"]'::jsonb),
  ('5', 'ترمیم ناخن', 'ترمیم و بازسازی ناخن آسیب‌دیده', 45, 300000, 5, '[]'::jsonb)
ON CONFLICT DO NOTHING;
