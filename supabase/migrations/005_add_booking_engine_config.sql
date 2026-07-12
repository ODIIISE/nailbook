-- Add proximity window and overflow config for booking engine v7
ALTER TABLE salon_info
  ADD COLUMN IF NOT EXISTS proximity_window_hours integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS allow_overflow boolean DEFAULT false;
