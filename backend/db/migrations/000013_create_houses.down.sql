DROP INDEX IF EXISTS idx_student_profiles_house_id;
ALTER TABLE student_profiles DROP COLUMN IF EXISTS house_id;
DROP TABLE IF EXISTS houses;
