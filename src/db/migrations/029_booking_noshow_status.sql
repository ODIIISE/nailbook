-- Migration 029: 'noshow' booking status.
-- v-2 reference: no-show is a terminal past state alongside completed
-- (timeline wine tone, excluded from availability and cancel windows).
-- Additive: existing rows are untouched, only the CHECK widens.

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'reserved', 'confirmed', 'in_progress', 'completed', 'cancelled', 'noshow'));
