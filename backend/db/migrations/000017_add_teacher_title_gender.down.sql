ALTER TABLE teacher_profiles DROP CONSTRAINT IF EXISTS teacher_profiles_title_check;
ALTER TABLE teacher_profiles DROP CONSTRAINT IF EXISTS teacher_profiles_gender_check;
ALTER TABLE teacher_profiles DROP COLUMN IF EXISTS title;
ALTER TABLE teacher_profiles DROP COLUMN IF EXISTS gender;
