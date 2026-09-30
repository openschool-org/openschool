-- One current academic year and one current term, enforced by the database (ADR 0003).
-- Deferred to commit, because SetCurrent flips the old and new rows in one UPDATE.
ALTER TABLE academic_years ADD CONSTRAINT academic_years_one_current
    EXCLUDE USING btree (is_current WITH =) WHERE (is_current) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE terms ADD CONSTRAINT terms_one_current
    EXCLUDE USING btree (is_current WITH =) WHERE (is_current) DEFERRABLE INITIALLY DEFERRED;

-- Plain indexes that duplicate a UNIQUE constraint's own index.
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_student_profiles_user_id;
DROP INDEX IF EXISTS idx_student_profiles_index_number;
DROP INDEX IF EXISTS idx_teacher_profiles_user_id;
DROP INDEX IF EXISTS idx_guardians_user_id;

-- Foreign keys without an index make deletes on the parent scan the child table.
CREATE INDEX IF NOT EXISTS idx_prefects_student_id ON prefects (student_id);
CREATE INDEX IF NOT EXISTS idx_section_heads_grade_id ON section_heads (grade_id);
CREATE INDEX IF NOT EXISTS idx_section_heads_stream_id ON section_heads (stream_id);
CREATE INDEX IF NOT EXISTS idx_grade_section_grades_grade_id ON grade_section_grades (grade_id);
CREATE INDEX IF NOT EXISTS idx_vice_principal_grade_scopes_grade_id ON vice_principal_grade_scopes (grade_id);
CREATE INDEX IF NOT EXISTS idx_timetable_option_blocks_grade_id ON timetable_option_blocks (grade_id);
CREATE INDEX IF NOT EXISTS idx_timetable_option_block_subjects_subject_id ON timetable_option_block_subjects (subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_period_requirements_grade_id ON subject_period_requirements (grade_id);
CREATE INDEX IF NOT EXISTS idx_student_intakes_grade_id ON student_intakes (grade_id);
CREATE INDEX IF NOT EXISTS idx_levels_stream_id ON levels (stream_id);
CREATE INDEX IF NOT EXISTS idx_levels_stream_group_id ON levels (stream_group_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollment_locks_level_id ON student_enrollment_locks (level_id);
CREATE INDEX IF NOT EXISTS idx_teacher_availability_academic_year_id ON teacher_availability (academic_year_id);

-- Search columns added since 000041, matched with ILIKE '%term%'.
CREATE INDEX IF NOT EXISTS idx_student_profiles_name_with_initials_trgm ON student_profiles USING GIN (name_with_initials gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_name_with_initials_trgm ON teacher_profiles USING GIN (name_with_initials gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_guardians_name_with_initials_trgm ON guardians USING GIN (name_with_initials gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_guardians_nic_number_trgm ON guardians USING GIN (nic_number gin_trgm_ops);
