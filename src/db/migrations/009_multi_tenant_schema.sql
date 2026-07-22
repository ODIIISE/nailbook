-- Multi-tenant schema: salons, super_admins, salon_id on all tables

-- Create salons table
CREATE TABLE IF NOT EXISTS salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  description TEXT DEFAULT '',
  slogan TEXT DEFAULT '',
  hero_image_url TEXT,
  logo_url TEXT,
  working_hours JSONB DEFAULT '{}',
  working_hours_text TEXT DEFAULT '',
  specific_days_off JSONB DEFAULT '[]',
  slot_buffer_minutes INTEGER DEFAULT 0,
  slot_interval_minutes INTEGER DEFAULT 15,
  early_extra_hours INTEGER DEFAULT 0,
  late_extra_hours INTEGER DEFAULT 0,
  expand_threshold INTEGER DEFAULT 80,
  proximity_window_hours INTEGER DEFAULT 2,
  allow_overflow BOOLEAN DEFAULT false,
  overflow_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create super_admins table
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  pin TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add salon_id columns to existing tables (IF NOT EXISTS for safety)
ALTER TABLE users ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES salons(id);
ALTER TABLE services ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES salons(id);
ALTER TABLE addons ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES salons(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES salons(id);
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES salons(id);
ALTER TABLE highlights ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES salons(id);
ALTER TABLE highlight_images ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES salons(id);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES salons(id);

-- Create indexes for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_users_salon ON users(salon_id);
CREATE INDEX IF NOT EXISTS idx_services_salon ON services(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookings_salon ON bookings(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookings_salon_date ON bookings(salon_id, date_gregorian);
CREATE INDEX IF NOT EXISTS idx_blocked_times_salon ON blocked_times(salon_id);
