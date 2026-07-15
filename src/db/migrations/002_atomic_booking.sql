-- ==========================================
-- Migration: 002_atomic_booking.sql
-- Purpose: Add atomic safety constraints and performance indexes
-- ==========================================

-- 1. Prevent Double Booking (The most critical fix)
-- This ensures two people cannot book the same time slot simultaneously.
-- We only enforce uniqueness on 'confirmed' bookings to allow pending states if needed later.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_unique_slot 
ON bookings (date_gregorian, start_time, end_time) 
WHERE status = 'confirmed';

-- 2. Performance Indexes
-- Speeds up the owner dashboard and slot checking queries
CREATE INDEX IF NOT EXISTS idx_bookings_date_status 
ON bookings (date_gregorian, status);

CREATE INDEX IF NOT EXISTS idx_bookings_phone 
ON bookings (customer_phone);

-- 3. Security: Ensure Owner Role is Enforced
-- Prevents accidental creation of non-owner users with role='owner' without proper setup
-- (This is a logical check, mostly handled by app logic, but good for data integrity)
ALTER TABLE users 
ADD CONSTRAINT chk_role_values 
CHECK (role IN ('customer', 'owner'));

-- 4. Audit Trail (Optional but recommended)
-- Create a table to log critical actions (bookings, cancellations) for debugging
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL, -- e.g., 'BOOKING_CREATED', 'BOOKING_CANCELLED'
  entity_id INTEGER, -- booking_id or user_id
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Clean up any existing duplicate confirmed bookings (Safety Cleanup)
-- NOTE: This keeps the OLDEST booking and marks newer duplicates as 'cancelled'
-- Run this carefully. If you are sure you have no duplicates, you can skip this block.
/*
WITH duplicates AS (
  SELECT id, date_gregorian, start_time, end_time,
         ROW_NUMBER() OVER (PARTITION BY date_gregorian, start_time, end_time ORDER BY created_at) as rn
  FROM bookings
  WHERE status = 'confirmed'
)
UPDATE bookings
SET status = 'cancelled', notes = 'Auto-cancelled due to duplicate detection migration'
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
*/
