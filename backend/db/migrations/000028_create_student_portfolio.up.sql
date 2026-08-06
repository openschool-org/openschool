-- student_progress_reports
-- a term-scoped narrative report written by a teacher (distinct from
-- term_marks, which is the numeric per-subject test score).
CREATE TABLE student_progress_reports (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       UUID        NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    term_id          UUID        NOT NULL REFERENCES terms (id)            ON DELETE CASCADE,
    narrative        TEXT        NOT NULL,
    written_by       UUID        REFERENCES teacher_profiles (id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, term_id)
);

CREATE INDEX idx_student_progress_reports_student_id ON student_progress_reports (student_id);
CREATE INDEX idx_student_progress_reports_term_id    ON student_progress_reports (term_id);

-- student_activities
-- clubs, sports, societies, and competitions are structurally identical
-- (a student participates in a named activity, in a role, in a given
-- academic year) — consolidated into one table with a category column
-- instead of four near-duplicate CRUD stacks.
CREATE TABLE student_activities (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       UUID        NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    academic_year_id UUID        NOT NULL REFERENCES academic_years (id)   ON DELETE CASCADE,
    category         VARCHAR(20) NOT NULL CHECK (category IN ('club', 'sport', 'society', 'competition')),
    name             VARCHAR(255) NOT NULL,
    role             VARCHAR(100),
    achievement      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_activities_student_id       ON student_activities (student_id);
CREATE INDEX idx_student_activities_academic_year_id  ON student_activities (academic_year_id);
CREATE INDEX idx_student_activities_category          ON student_activities (category);

-- student_leadership_roles
-- non-prefect leadership (club president, sports captain, etc.) — prefect
-- appointments themselves stay in the existing prefects table (Phase 6.4).
CREATE TABLE student_leadership_roles (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       UUID        NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    academic_year_id UUID        NOT NULL REFERENCES academic_years (id)   ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL,
    scope            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_leadership_roles_student_id      ON student_leadership_roles (student_id);
CREATE INDEX idx_student_leadership_roles_academic_year_id ON student_leadership_roles (academic_year_id);

-- student_awards
CREATE TABLE student_awards (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       UUID        NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    academic_year_id UUID        NOT NULL REFERENCES academic_years (id)   ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL,
    category         VARCHAR(100),
    awarded_date     DATE        NOT NULL,
    description      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_awards_student_id      ON student_awards (student_id);
CREATE INDEX idx_student_awards_academic_year_id ON student_awards (academic_year_id);

-- student_disciplinary_records
CREATE TABLE student_disciplinary_records (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       UUID        NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    academic_year_id UUID        NOT NULL REFERENCES academic_years (id)   ON DELETE CASCADE,
    incident_date    DATE        NOT NULL,
    description      TEXT        NOT NULL,
    action_taken     TEXT,
    severity         VARCHAR(20) NOT NULL CHECK (severity IN ('minor', 'major', 'severe')),
    recorded_by      UUID        REFERENCES users (id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_disciplinary_records_student_id      ON student_disciplinary_records (student_id);
CREATE INDEX idx_student_disciplinary_records_academic_year_id ON student_disciplinary_records (academic_year_id);
