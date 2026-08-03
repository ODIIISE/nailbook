-- Tenant-aware booking uniqueness.
-- The previous index was global and caused two salons to conflict on the same time.
DROP INDEX IF EXISTS idx_bookings_unique_slot;

-- Once the global index is removed, preserve legitimate cross-tenant matches
-- and cancel only duplicate active rows within the same tenant (keeping the
-- oldest record deterministic). This makes the migration safe on existing data.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY salon_id, date_gregorian, start_time, end_time
           ORDER BY created_at NULLS FIRST, id
         ) AS rn
  FROM bookings
  WHERE status IN ('reserved', 'confirmed')
)
UPDATE bookings
SET status = 'cancelled'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_unique_tenant_slot
ON bookings (salon_id, date_gregorian, start_time, end_time)
WHERE salon_id IS NOT NULL AND status IN ('reserved', 'confirmed');

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_unique_legacy_slot
ON bookings (date_gregorian, start_time, end_time)
WHERE salon_id IS NULL AND status IN ('reserved', 'confirmed');
