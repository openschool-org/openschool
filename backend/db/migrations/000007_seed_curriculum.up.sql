-- Drop name uniqueness so the same subject name can exist at several levels
-- (e.g. "Mathematics" offered under a different code per level).
--
-- This migration previously seeded a national curriculum. That seed has been
-- removed: curriculum structure is admin-entered data, not schema. Only the
-- constraint change is kept, because the version has already been applied to
-- existing databases and must not be renumbered.
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_name_key;
