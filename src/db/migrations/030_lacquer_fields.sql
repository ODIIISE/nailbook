-- Migration 030: lacquer (signature color) for services and artists.
-- v-2 reference: every service and artist carries a lacquer key
-- (pearl/wine/gold/rose/mocha/nude/ink) driving gradients and monograms.
-- Free-form TEXT with a safe default (like users.roles): the API validates
-- membership, the database stays permissive for restores and rollbacks.

ALTER TABLE services ADD COLUMN IF NOT EXISTS lacquer TEXT NOT NULL DEFAULT 'pearl';
ALTER TABLE users ADD COLUMN IF NOT EXISTS lacquer TEXT NOT NULL DEFAULT 'pearl';
