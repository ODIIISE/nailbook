-- Forehand Nail Studio - Complete Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  pin TEXT NOT NULL,
  name TEXT DEFAULT '',
  role TEXT DEFAULT 'customer',
  failed_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salon info
CREATE TABLE IF NOT EXISTS salon_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Forehand Nail Studio',
  description TEXT DEFAULT '',
  slogan TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  hero_image_url TEXT,
  logo_url TEXT,
  working_hours JSONB DEFAULT '{"sat":{"open":"10:00","close":"18:00"},"sun":{"open":"10:00","close":"18:00"},"mon":{"open":"10:00","close":"18:00"},"tue":{"open":"10:00","close":"18:00"},"wed":{"open":"10:00","close":"18:00"},"thu":{"open":"10:00","close":"18:00"},"fri":null}'::jsonb,
  specific_days_off JSONB DEFAULT '[]'::jsonb,
  slot_buffer_minutes INT DEFAULT 15,
  slot_interval_minutes INT DEFAULT 15,
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

-- Addons
CREATE TABLE IF NOT EXISTS addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  duration_minutes INT NOT NULL DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  service_id UUID REFERENCES services(id),
  selected_addons JSONB DEFAULT '[]'::jsonb,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  date TEXT NOT NULL,
  date_gregorian DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  paid BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT true,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocked times
CREATE TABLE IF NOT EXISTS blocked_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_gregorian DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date_gregorian);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(customer_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_blocked_times_date ON blocked_times(date_gregorian);

-- Seed salon info
INSERT INTO salon_info (name, description, slogan, phone, address) VALUES
  ('استدیو تخصصی ناخن فورهند', 'Forehand Nail Studio — استدیو تخصصی ناخن در مشهد', 'زیبایی ناخن، اعتماد به نفس شما', '09308681363', 'مشهد، نebin صارمی ۳۸/۱۲، پلاک ۷۷')
ON CONFLICT DO NOTHING;

-- Seed services
INSERT INTO services (id, name, description, duration_minutes, price, sort_order, addon_ids) VALUES
  ('1', 'ژلیش ناخن', 'ماندگاری بالا و براقیت فوق‌العاده', 45, 350000, 1, '["a1","a2","a3"]'::jsonb),
  ('2', 'فرنچ ناخن', 'کلاسیک و شیک، مناسب هر موقعیت', 60, 450000, 2, '["a4","a5"]'::jsonb),
  ('3', 'طراحی ناخن', 'طراحی سفارشی با بهترین مواد', 90, 600000, 3, '[]'::jsonb),
  ('4', 'پدیکور', 'مراقبت کامل پا + لاک', 60, 400000, 4, '["a6"]'::jsonb),
  ('5', 'ترمیم ناخن', 'ترمیم و بازسازی ناخن آسیب‌دیده', 45, 300000, 5, '[]'::jsonb)
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
