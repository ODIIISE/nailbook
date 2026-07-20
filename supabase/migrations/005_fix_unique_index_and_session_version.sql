-- Migration 005: Fix unique index + add session_version column
-- Fixes C4 (unique index only covered 'confirmed') and C6 (missing session_version)

-- 1. Deduplicate: remove older conflicting bookings before creating the index
-- If two bookings share the same (date_gregorian, start_time, end_time) with
-- status in ('reserved', 'confirmed'), keep the older one and cancel the newer.
DELETE FROM bookings b1
USING bookings b2
WHERE b1.date_gregorian = b2.date_gregorian
  AND b1.start_time = b2.start_time
  AND b1.end_time = b2.end_time
  AND b1.id > b2.id
  AND b1.status IN ('reserved', 'confirmed')
  AND b2.status IN ('reserved', 'confirmed');

-- 2. Fix unique index: cover both 'reserved' and 'confirmed' statuses
DROP INDEX IF EXISTS idx_bookings_no_overlap;

CREATE UNIQUE INDEX idx_bookings_no_overlap
  ON bookings (date_gregorian, start_time, end_time)
  WHERE status IN ('reserved', 'confirmed');

-- 3. Add session_version column for customer session invalidation
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INT DEFAULT 0;
