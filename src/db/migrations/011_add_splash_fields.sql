-- Splash screen editable fields. Backed by salon context so the owner
-- can edit title / slogan / logo from /owner/settings and customers see
-- them on first paint.

ALTER TABLE salons ADD COLUMN IF NOT EXISTS splash_title TEXT DEFAULT 'Forehand Nail';
ALTER TABLE salons ADD COLUMN IF NOT EXISTS splash_slogan TEXT DEFAULT 'Nail Art Studio';
ALTER TABLE salons ADD COLUMN IF NOT EXISTS splash_logo_url TEXT;
