-- Migration 005: Fix unique index + add session_version column
-- Fixes C4 (unique index only covered 'confirmed') and C6 (missing session_version)

-- 1. Fix unique index: cover both 'reserved' and 'confirmed' statuses
-- Drop the old index that only covered 'confirmed'
DROP INDEX IF EXISTS idx_bookings_no_overlap;

-- Create new index covering both active statuses
CREATE UNIQUE INDEX idx_bookings_no_overlap
  ON bookings (date_gregorian, start_time, end_time)
  WHERE status IN ('reserved', 'confirmed');

-- 2. Add session_version column for customer session invalidation
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INT DEFAULT 0;
