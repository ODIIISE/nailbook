-- Migration 004: Atomic booking + payment persistence
-- Run manually in Neon console if not already applied

-- 1. Add unique constraint to prevent double-booking at DB level
-- (The application also uses SELECT FOR UPDATE for real-time prevention)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_no_overlap
  ON bookings (date_gregorian, start_time, end_time)
  WHERE status = 'confirmed';

-- 2. Ensure paid column exists (should already be in schema)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT false;

-- 3. Add index for faster booking lookups by date
CREATE INDEX IF NOT EXISTS idx_bookings_date_status
  ON bookings (date_gregorian, status);
