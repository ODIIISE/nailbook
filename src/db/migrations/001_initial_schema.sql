-- ==========================================
-- Migration: 001_initial_schema.sql
-- Purpose: Create initial database schema
-- ==========================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  pin TEXT,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'owner')),
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salon info table (singleton)
CREATE TABLE IF NOT EXISTS salon_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Forehand Nail Studio',
  description TEXT DEFAULT '',
  slogan TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  hero_image_url TEXT,
  logo_url TEXT,
  working_hours JSONB DEFAULT '{}',
  working_hours_text TEXT DEFAULT 'شنبه تا پنج شنبه . ۱۰ تا ۱۸',
  slot_buffer_minutes INTEGER DEFAULT 0,
  slot_interval_minutes INTEGER DEFAULT 15,
  early_extra_hours INTEGER DEFAULT 0,
  late_extra_hours INTEGER DEFAULT 0,
  expand_threshold INTEGER DEFAULT 80,
  proximity_window_hours INTEGER DEFAULT 2,
  allow_overflow BOOLEAN DEFAULT false,
  overflow_minutes INTEGER DEFAULT 0,
  specific_days_off TEXT[] DEFAULT '{}'
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  addon_ids TEXT[] DEFAULT '{}',
  priority_score INTEGER DEFAULT 5
);

-- Addons table
CREATE TABLE IF NOT EXISTS addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  selected_addons TEXT[] DEFAULT '{}',
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL,
  date TEXT NOT NULL,
  date_gregorian DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  phone_verified BOOLEAN DEFAULT true,
  paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocked times table
CREATE TABLE IF NOT EXISTS blocked_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_gregorian DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

-- Highlights table
CREATE TABLE IF NOT EXISTS highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cover_url TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Highlight images table
CREATE TABLE IF NOT EXISTS highlight_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id UUID REFERENCES highlights(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);
