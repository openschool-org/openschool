DROP INDEX IF EXISTS idx_guardians_nic_number_trgm;
DROP INDEX IF EXISTS idx_guardians_name_with_initials_trgm;
DROP INDEX IF EXISTS idx_teacher_profiles_name_with_initials_trgm;
DROP INDEX IF EXISTS idx_student_profiles_name_with_initials_trgm;

DROP INDEX IF EXISTS idx_teacher_availability_academic_year_id;
DROP INDEX IF EXISTS idx_student_enrollment_locks_level_id;
DROP INDEX IF EXISTS idx_levels_stream_group_id;
DROP INDEX IF EXISTS idx_levels_stream_id;
DROP INDEX IF EXISTS idx_student_intakes_grade_id;
DROP INDEX IF EXISTS idx_subject_period_requirements_grade_id;
DROP INDEX IF EXISTS idx_timetable_option_block_subjects_subject_id;
DROP INDEX IF EXISTS idx_timetable_option_blocks_grade_id;
DROP INDEX IF EXISTS idx_vice_principal_grade_scopes_grade_id;
DROP INDEX IF EXISTS idx_grade_section_grades_grade_id;
DROP INDEX IF EXISTS idx_section_heads_stream_id;
DROP INDEX IF EXISTS idx_section_heads_grade_id;
DROP INDEX IF EXISTS idx_prefects_student_id;

CREATE INDEX IF NOT EXISTS idx_guardians_user_id ON guardians (user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user_id ON teacher_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_index_number ON student_profiles (index_number);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

ALTER TABLE terms DROP CONSTRAINT IF EXISTS terms_one_current;
ALTER TABLE academic_years DROP CONSTRAINT IF EXISTS academic_years_one_current;
