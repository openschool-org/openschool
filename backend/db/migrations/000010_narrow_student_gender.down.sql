ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_gender_check;
ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_gender_check
    CHECK (gender IS NULL OR gender IN ('male', 'female', 'other'));
