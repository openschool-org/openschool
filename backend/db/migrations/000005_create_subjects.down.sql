DROP TABLE IF EXISTS student_subject_selections;
DROP TABLE IF EXISTS subject_bucket_options;
DROP TABLE IF EXISTS subject_buckets;
DROP TABLE IF EXISTS teacher_subjects;
DROP TABLE IF EXISTS grade_subjects;

ALTER TABLE class_subject_teachers
    DROP CONSTRAINT IF EXISTS fk_cst_subject;

DROP TABLE IF EXISTS subjects;
