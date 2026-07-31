-- section_heads
-- "Teacher in Charge" (TIC) for a grade, per academic year.
-- stream_id is nullable: NULL means the TIC oversees the whole grade
-- (grades below A/L); set means the TIC oversees one A/L stream within
-- that grade (e.g. Grade 12 Physical Science has its own TIC, separate
-- from Grade 12 Commerce). Two partial unique indexes enforce "at most one
-- TIC per (year, grade)" and "at most one TIC per (year, grade, stream)"
-- respectively, since a plain UNIQUE treats NULL stream_id values as
-- distinct from each other.
CREATE TABLE section_heads (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id  UUID        NOT NULL REFERENCES academic_years (id) ON DELETE CASCADE,
    grade_id          UUID        NOT NULL REFERENCES grades (id)         ON DELETE CASCADE,
    stream_id         UUID        REFERENCES streams (id)                 ON DELETE CASCADE,
    teacher_id        UUID        NOT NULL REFERENCES teacher_profiles (id) ON DELETE RESTRICT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_section_heads_grade_unique
    ON section_heads (academic_year_id, grade_id)
    WHERE stream_id IS NULL;

CREATE UNIQUE INDEX idx_section_heads_grade_stream_unique
    ON section_heads (academic_year_id, grade_id, stream_id)
    WHERE stream_id IS NOT NULL;

CREATE INDEX idx_section_heads_teacher_id ON section_heads (teacher_id);
