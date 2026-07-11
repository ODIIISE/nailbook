-- 1. Prevent Double Booking (CRITICAL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_unique_slot 
ON bookings (date_gregorian, start_time, end_time) 
WHERE status = 'confirmed';

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings (date_gregorian, status);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings (customer_phone);

-- 3. Data Integrity
ALTER TABLE users ADD CONSTRAINT chk_role_values CHECK (role IN ('customer', 'owner'));
