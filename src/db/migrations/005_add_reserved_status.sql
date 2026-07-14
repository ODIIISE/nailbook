-- ==========================================
-- Migration: 005_add_reserved_status.sql
-- Purpose: Add 'reserved' status to bookings table
-- ==========================================

-- Drop the old CHECK constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add new CHECK constraint with 'reserved' status
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'reserved', 'confirmed', 'in_progress', 'completed', 'cancelled'));

-- Set default to 'reserved' for new bookings
ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'reserved';
