-- Migration 022: price snapshot on bookings
-- calculateEarnings re-priced every historical booking with CURRENT service
-- prices; deleting a service NULLed bookings.service_id and silently zeroed
-- its revenue. New bookings carry the name and total price as they were at
-- booking time. Legacy rows keep NULL and fall back to the old re-pricing.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price_total INTEGER;
