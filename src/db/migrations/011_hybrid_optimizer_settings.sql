ALTER TABLE salon_info
  ADD COLUMN IF NOT EXISTS optimization_mode TEXT DEFAULT 'hybrid',
  ADD COLUMN IF NOT EXISTS suggestion_limit INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS min_useful_gap_minutes INTEGER DEFAULT 30;

ALTER TABLE salons
  ADD COLUMN IF NOT EXISTS optimization_mode TEXT DEFAULT 'hybrid',
  ADD COLUMN IF NOT EXISTS suggestion_limit INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS min_useful_gap_minutes INTEGER DEFAULT 30;

UPDATE salon_info
SET optimization_mode = 'hybrid'
WHERE optimization_mode IS NULL OR optimization_mode NOT IN ('hybrid', 'legacy');

UPDATE salon_info
SET suggestion_limit = 3
WHERE suggestion_limit IS NULL OR suggestion_limit < 1 OR suggestion_limit > 10;

UPDATE salon_info
SET min_useful_gap_minutes = 30
WHERE min_useful_gap_minutes IS NULL OR min_useful_gap_minutes < 0 OR min_useful_gap_minutes > 180;

UPDATE salons
SET optimization_mode = 'hybrid'
WHERE optimization_mode IS NULL OR optimization_mode NOT IN ('hybrid', 'legacy');

UPDATE salons
SET suggestion_limit = 3
WHERE suggestion_limit IS NULL OR suggestion_limit < 1 OR suggestion_limit > 10;

UPDATE salons
SET min_useful_gap_minutes = 30
WHERE min_useful_gap_minutes IS NULL OR min_useful_gap_minutes < 0 OR min_useful_gap_minutes > 180;

ALTER TABLE salon_info
  DROP CONSTRAINT IF EXISTS salon_info_optimization_mode_check;
ALTER TABLE salon_info
  ADD CONSTRAINT salon_info_optimization_mode_check
  CHECK (optimization_mode IN ('hybrid', 'legacy'));

ALTER TABLE salons
  DROP CONSTRAINT IF EXISTS salons_optimization_mode_check;
ALTER TABLE salons
  ADD CONSTRAINT salons_optimization_mode_check
  CHECK (optimization_mode IN ('hybrid', 'legacy'));
