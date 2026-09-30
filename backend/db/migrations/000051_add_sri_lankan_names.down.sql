ALTER TABLE guardians        DROP COLUMN IF EXISTS calling_name, DROP COLUMN IF EXISTS name_with_initials;
ALTER TABLE teacher_profiles DROP COLUMN IF EXISTS calling_name, DROP COLUMN IF EXISTS name_with_initials;
ALTER TABLE student_profiles DROP COLUMN IF EXISTS calling_name, DROP COLUMN IF EXISTS name_with_initials;
