-- student_enrollment_locks
-- presence of a row means the student's subject picks for that level+year
-- are confirmed and locked — Submit/Delete on student_subject_enrollments
-- refuse to touch a locked (student_id, level_id, academic_year_id). Only an
-- admin-only unlock endpoint removes the row, re-opening editing.
CREATE TABLE student_enrollment_locks (
    student_id       UUID        NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    level_id         UUID        NOT NULL REFERENCES levels (id)            ON DELETE CASCADE,
    academic_year_id UUID        NOT NULL REFERENCES academic_years (id)    ON DELETE RESTRICT,
    locked_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_id, level_id, academic_year_id)
);
