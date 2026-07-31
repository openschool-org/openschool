-- terms
-- an academic year is split into terms (typically 3); marks are captured
-- per term via the term test
CREATE TABLE terms (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID         NOT NULL REFERENCES academic_years (id) ON DELETE CASCADE,
    name             VARCHAR(50)  NOT NULL,
    start_date       DATE         NOT NULL,
    end_date         DATE         NOT NULL,
    is_current       BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order       INTEGER      NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (start_date < end_date),
    UNIQUE (academic_year_id, name)
);

CREATE INDEX idx_terms_academic_year_id ON terms (academic_year_id);

-- term_marks
-- one row per student, per subject, per term — the term test mark
CREATE TABLE term_marks (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID         NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    subject_id UUID         NOT NULL REFERENCES subjects (id)         ON DELETE CASCADE,
    term_id    UUID         NOT NULL REFERENCES terms (id)            ON DELETE CASCADE,
    marks      NUMERIC(5,2) NOT NULL,
    max_marks  NUMERIC(5,2) NOT NULL DEFAULT 100,
    entered_by UUID         REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (marks >= 0 AND marks <= max_marks),
    UNIQUE (student_id, subject_id, term_id)
);

CREATE INDEX idx_term_marks_student_id ON term_marks (student_id);
CREATE INDEX idx_term_marks_term_id    ON term_marks (term_id);
CREATE INDEX idx_term_marks_subject_id ON term_marks (subject_id);
