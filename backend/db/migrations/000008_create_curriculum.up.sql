-- Replaces the grade-bound bucket model with a generic curriculum engine.
--
-- Nothing here encodes a particular country's exam system. A level is any
-- container the admin names; a selection group is any pool with a pick range.
-- "mandatory" is not a flag — it is min_select = max_select = pool size.
-- All labels are data the admin types in.

-- ── Remove the old grade-bound model ────────────────────────────────────────
DROP TABLE IF EXISTS student_subject_selections;
DROP TABLE IF EXISTS subject_bucket_options;
DROP TABLE IF EXISTS subject_buckets;
DROP TABLE IF EXISTS grade_subjects;

-- ── subjects: descriptive type tag ──────────────────────────────────────────
-- free text on purpose — the useful tags differ per school and country, and
-- no code branches on this value
ALTER TABLE subjects ADD COLUMN type VARCHAR(50);

-- ── school: instance-level grade range ──────────────────────────────────────
-- drives which levels a school's UI offers; the backend never infers meaning
-- from the numbers
ALTER TABLE school ADD COLUMN grade_from INT;
ALTER TABLE school ADD COLUMN grade_to   INT;
ALTER TABLE school ADD CONSTRAINT school_grade_range_check
    CHECK (grade_from IS NULL OR grade_to IS NULL OR grade_from <= grade_to);

-- ── mediums ─────────────────────────────────────────────────────────────────
-- school-defined languages of instruction, referenced only as an optional
-- restriction on a group subject
CREATE TABLE mediums (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── levels ──────────────────────────────────────────────────────────────────
-- an admin-named container for a set of subject rules: a grade, a track, an
-- exam stage, whatever the school defines. grade_id is optional — levels not
-- tied to a single grade leave it NULL.
CREATE TABLE levels (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    label      VARCHAR(150) NOT NULL UNIQUE,
    grade_id   UUID         REFERENCES grades (id) ON DELETE RESTRICT,
    sort_order INT          NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_levels_grade_id ON levels (grade_id);

-- ── selection_groups ────────────────────────────────────────────────────────
-- a pool the student must pick between min_select and max_select subjects from
CREATE TABLE selection_groups (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id   UUID         NOT NULL REFERENCES levels (id) ON DELETE CASCADE,
    label      VARCHAR(150) NOT NULL,
    min_select INT          NOT NULL,
    max_select INT          NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (level_id, label),
    CHECK (min_select >= 0),
    CHECK (max_select >= min_select)
);

CREATE INDEX idx_selection_groups_level_id ON selection_groups (level_id);

-- ── group_subjects ──────────────────────────────────────────────────────────
-- subjects offered inside a group. medium_id NULL means "any medium".
-- prerequisite_note is guidance shown to admins/students, never enforced.
CREATE TABLE group_subjects (
    group_id          UUID        NOT NULL REFERENCES selection_groups (id) ON DELETE CASCADE,
    subject_id        UUID        NOT NULL REFERENCES subjects (id)         ON DELETE RESTRICT,
    medium_id         UUID        REFERENCES mediums (id)                   ON DELETE RESTRICT,
    prerequisite_note TEXT,
    sort_order        INT         NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, subject_id)
);

CREATE INDEX idx_group_subjects_group_id   ON group_subjects (group_id);
CREATE INDEX idx_group_subjects_subject_id ON group_subjects (subject_id);
CREATE INDEX idx_group_subjects_medium_id  ON group_subjects (medium_id);

-- ── student_subject_enrollments ─────────────────────────────────────────────
-- what a student actually picked, per academic year. a frozen snapshot: group,
-- subject and medium are RESTRICT so historical rows survive curriculum edits,
-- and the row is never recomputed from the current config.
-- the composite PK allows several subjects per group (max_select > 1).
CREATE TABLE student_subject_enrollments (
    student_id       UUID        NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    academic_year_id UUID        NOT NULL REFERENCES academic_years (id)   ON DELETE RESTRICT,
    group_id         UUID        NOT NULL REFERENCES selection_groups (id) ON DELETE RESTRICT,
    subject_id       UUID        NOT NULL REFERENCES subjects (id)         ON DELETE RESTRICT,
    medium_id        UUID        REFERENCES mediums (id)                   ON DELETE RESTRICT,
    enrolled_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_id, academic_year_id, group_id, subject_id)
);

CREATE INDEX idx_sse_student_id       ON student_subject_enrollments (student_id);
CREATE INDEX idx_sse_academic_year_id ON student_subject_enrollments (academic_year_id);
CREATE INDEX idx_sse_group_id         ON student_subject_enrollments (group_id);
CREATE INDEX idx_sse_subject_id       ON student_subject_enrollments (subject_id);
