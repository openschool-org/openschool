-- New students admitted for a grade in a coming year (Grade 6 scholarship, Grade 10,
-- A/L intake). Promotion places them with everyone else and then removes the row.
CREATE TABLE student_intakes (
    student_id       UUID        PRIMARY KEY REFERENCES student_profiles (id) ON DELETE CASCADE,
    academic_year_id UUID        NOT NULL REFERENCES academic_years (id) ON DELETE CASCADE,
    grade_id         UUID        NOT NULL REFERENCES grades (id) ON DELETE CASCADE,
    medium_id        UUID        REFERENCES mediums (id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_intakes_year_grade ON student_intakes (academic_year_id, grade_id);
