-- gender is optional and free-valued within a small fixed set, matching how
-- the rest of the schema treats descriptive-but-constrained fields
ALTER TABLE student_profiles ADD COLUMN gender VARCHAR(10);
ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_gender_check
    CHECK (gender IS NULL OR gender IN ('male', 'female', 'other'));
