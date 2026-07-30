-- title and gender are optional, free-valued within a small fixed set —
-- same pattern as student_profiles.gender.
ALTER TABLE teacher_profiles ADD COLUMN title  VARCHAR(10);
ALTER TABLE teacher_profiles ADD COLUMN gender VARCHAR(10);

ALTER TABLE teacher_profiles ADD CONSTRAINT teacher_profiles_title_check
    CHECK (title IS NULL OR title IN ('Mr', 'Miss', 'Mrs', 'Ms', 'Dr', 'Von', 'Prof'));

ALTER TABLE teacher_profiles ADD CONSTRAINT teacher_profiles_gender_check
    CHECK (gender IS NULL OR gender IN ('male', 'female'));
