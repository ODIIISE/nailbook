-- ==========================================
-- Migration: 008_unique_index_reserved_status.sql
-- Purpose: Extend unique slot index to cover 'reserved' status to prevent TOCTOU double-booking
-- Safety: Includes duplicate cleanup before index creation
-- ==========================================

-- 1. Resolve existing duplicates (keep oldest, cancel newer duplicates)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY date_gregorian, start_time, end_time
    ORDER BY created_at
  ) as rn
  FROM bookings
  WHERE status IN ('reserved', 'confirmed')
)
UPDATE bookings
SET status = 'cancelled'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Drop the old partial unique index that only covered 'confirmed'
DROP INDEX IF EXISTS idx_bookings_unique_slot;

-- 3. Create new index covering both 'reserved' and 'confirmed'
-- NOTE: On large tables, use CREATE UNIQUE INDEX CONCURRENTLY to avoid locking writes
CREATE UNIQUE INDEX idx_bookings_unique_slot
ON bookings (date_gregorian, start_time, end_time)
WHERE status IN ('reserved', 'confirmed');
