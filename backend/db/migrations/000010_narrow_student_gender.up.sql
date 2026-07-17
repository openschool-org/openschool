-- Narrowed from (male, female, other) to (male, female) per product decision.
ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_gender_check;
ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_gender_check
    CHECK (gender IS NULL OR gender IN ('male', 'female'));
