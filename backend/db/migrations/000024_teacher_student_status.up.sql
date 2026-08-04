-- teacher_profiles.employment_status: separate from is_active (which
-- tracks "has a subject assigned"). Set to resigned/transferred when a
-- teacher leaves the school.
ALTER TABLE teacher_profiles
    ADD COLUMN employment_status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (employment_status IN ('active', 'resigned', 'transferred'));

-- student_profiles.enrollment_status: set to 'left' when a student leaves
-- the school.
ALTER TABLE student_profiles
    ADD COLUMN enrollment_status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (enrollment_status IN ('active', 'left'));
