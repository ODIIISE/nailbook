-- Fix foreign key constraint on bookings.service_id to allow service deletion
-- Drop the existing constraint and recreate with ON DELETE SET NULL

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_id_fkey;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
