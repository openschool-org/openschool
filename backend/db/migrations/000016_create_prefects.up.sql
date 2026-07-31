-- prefects
-- School-wide student leadership roster, scoped to an academic year (like
-- section_heads and class teacher assignments — these are yearly
-- appointments). A student holds at most one rank per year; the same rank
-- can be held by several students (e.g. multiple Senior Prefects).
CREATE TABLE prefects (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id  UUID         NOT NULL REFERENCES academic_years (id)   ON DELETE CASCADE,
    student_id        UUID         NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    rank              VARCHAR(20)  NOT NULL CHECK (rank IN ('junior', 'senior', 'deputy_head', 'head')),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (academic_year_id, student_id)
);

CREATE INDEX idx_prefects_academic_year_id ON prefects (academic_year_id);
CREATE INDEX idx_prefects_rank             ON prefects (rank);
