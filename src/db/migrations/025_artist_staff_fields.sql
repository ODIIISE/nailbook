-- Migration 025: artist staff profiles + booking artist assignment.
-- Roles themselves live in users.roles[] (free-form, no CHECK), so no role
-- change is needed: an artist is roles = {customer,artist}.
-- v-2 reference: artist specialty / work days / service assignments.

ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_days JSONB NOT NULL DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS service_ids JSONB NOT NULL DEFAULT '[]';

-- Which artist owns the booking. NULL = unassigned (walk-in / legacy rows).
-- Overlap rules stay time-based unless scoped per artist by the API layer.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS artist_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_artist ON bookings(artist_id);
