DROP TRIGGER IF EXISTS trg_class_students_set_academic_year ON class_students;
DROP FUNCTION IF EXISTS set_class_students_academic_year_id();

ALTER TABLE class_students
    DROP CONSTRAINT IF EXISTS class_students_student_academic_year_unique,
    DROP CONSTRAINT IF EXISTS class_students_academic_year_id_fkey,
    DROP COLUMN IF EXISTS academic_year_id;
