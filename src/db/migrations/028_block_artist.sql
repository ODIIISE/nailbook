-- Migration 028: per-artist blocked times.
-- v-2 reference: blocks carry an optional artistId (null = whole salon).
-- The slot engine still treats every block as salon-wide (safe
-- over-blocking); artist_id is assignment metadata for display and for a
-- future per-artist engine. No CHECK needed: NULL or a users FK.

ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS artist_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_blocked_times_artist ON blocked_times(artist_id);
