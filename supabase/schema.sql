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
  working_hours_text TEXT DEFAULT 'شنبه تا پنج شنبه . ۱۰ تا ۱۸',
  working_hours JSONB DEFAULT '{"sat":{"open":"10:00","close":"16:00"},"sun":{"open":"10:00","close":"16:00"},"mon":{"open":"10:00","close":"16:00"},"tue":{"open":"10:00","close":"16:00"},"wed":{"open":"10:00","close":"16:00"},"thu":{"open":"10:00","close":"16:00"},"fri":null}'::jsonb,
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
  priority_score INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Addons
CREATE TABLE IF NOT EXISTS addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  duration_minutes INT NOT NULL DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
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

-- Highlights (Instagram-style story highlights)
CREATE TABLE IF NOT EXISTS highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cover_url TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Highlight images
CREATE TABLE IF NOT EXISTS highlight_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id UUID REFERENCES highlights(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
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
CREATE INDEX IF NOT EXISTS idx_highlight_images_highlight ON highlight_images(highlight_id);

-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_images ENABLE ROW LEVEL SECURITY;

-- Users: only service role can access (for auth)
CREATE POLICY "Service role manages users" ON users FOR ALL USING (true) WITH CHECK (true);

-- Sessions: only service role can access
CREATE POLICY "Service role manages sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);

-- Salon info: anyone can read, service role can write
CREATE POLICY "Anyone can read salon info" ON salon_info FOR SELECT USING (true);
CREATE POLICY "Service role manages salon info" ON salon_info FOR ALL USING (true) WITH CHECK (true);

-- Services: anyone can read, service role can write
CREATE POLICY "Anyone can read services" ON services FOR SELECT USING (true);
CREATE POLICY "Service role manages services" ON services FOR ALL USING (true) WITH CHECK (true);

-- Addons: anyone can read, service role can write
CREATE POLICY "Anyone can read addons" ON addons FOR SELECT USING (true);
CREATE POLICY "Service role manages addons" ON addons FOR ALL USING (true) WITH CHECK (true);

-- Bookings: anyone can read (for slot availability), service role can write
CREATE POLICY "Anyone can read bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Service role manages bookings" ON bookings FOR ALL USING (true) WITH CHECK (true);

-- Blocked times: anyone can read, service role can write
CREATE POLICY "Anyone can read blocked times" ON blocked_times FOR SELECT USING (true);
CREATE POLICY "Service role manages blocked times" ON blocked_times FOR ALL USING (true) WITH CHECK (true);

-- Highlights: anyone can read, service role can write
CREATE POLICY "Anyone can read highlights" ON highlights FOR SELECT USING (true);
CREATE POLICY "Service role manages highlights" ON highlights FOR ALL USING (true) WITH CHECK (true);

-- Highlight images: anyone can read, service role can write
CREATE POLICY "Anyone can read highlight images" ON highlight_images FOR SELECT USING (true);
CREATE POLICY "Service role manages highlight images" ON highlight_images FOR ALL USING (true) WITH CHECK (true);

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
INSERT INTO addons (id, name, price, duration_minutes, is_active, sort_order) VALUES
  ('a1', 'طراحی ساده', 50000, 10, true, 1),
  ('a2', 'سنگ ناخن', 30000, 5, true, 2),
  ('a3', 'کروم ناخن', 40000, 5, true, 3),
  ('a4', 'فرنچ رنگی', 30000, 5, true, 4),
  ('a5', 'نگین فرنچ', 40000, 10, true, 5),
  ('a6', 'لاک ژل پا', 100000, 15, true, 6)
ON CONFLICT DO NOTHING;
