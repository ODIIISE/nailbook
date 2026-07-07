-- Add sort_order column to addons table
ALTER TABLE addons ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- Set sort_order for existing addons based on created_at
UPDATE addons SET sort_order = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn FROM addons
) sub WHERE addons.id = sub.id AND addons.sort_order = 0;
