-- Homepage background video: one optional customer-facing clip behind the
-- editorial hero. Owner-managed from settings (upload → Vercel Blob); the Lux
-- homepage falls back to the bundled /media/forehand-hero.mp4 when empty.
ALTER TABLE salons ADD COLUMN IF NOT EXISTS hero_video_url TEXT DEFAULT NULL;
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS hero_video_url TEXT DEFAULT NULL;