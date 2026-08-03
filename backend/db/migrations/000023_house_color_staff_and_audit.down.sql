DROP TABLE IF EXISTS audit_logs;

DROP INDEX IF EXISTS idx_teacher_profiles_house_id;
ALTER TABLE teacher_profiles DROP COLUMN IF EXISTS house_id;

ALTER TABLE houses DROP COLUMN color;
ALTER TABLE houses ADD COLUMN remainder INT NOT NULL DEFAULT 0;
