-- ==========================================
-- Migration: 012_waitlist_and_portfolio.sql
-- Purpose: Bookable portfolio (highlights.service_id) + waitlist for fully-booked days
-- ==========================================

-- T4-02: Add optional service_id FK to highlights for bookable portfolio
ALTER TABLE highlights ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL;

-- T4-01: Waitlist table — customers join when a day is fully booked
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_gregorian DATE NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL,
  notification_method TEXT NOT NULL DEFAULT 'sms' CHECK (notification_method IN ('sms', 'whatsapp')),
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by date (owner dashboard + API)
CREATE INDEX IF NOT EXISTS idx_waitlist_date ON waitlist(date_gregorian);

-- Unique constraint: one entry per phone per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_phone_date ON waitlist(customer_phone, date_gregorian);
