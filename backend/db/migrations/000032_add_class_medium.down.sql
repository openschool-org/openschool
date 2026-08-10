DROP INDEX IF EXISTS idx_classes_medium_id;

ALTER TABLE classes
    DROP COLUMN IF EXISTS medium_id;
