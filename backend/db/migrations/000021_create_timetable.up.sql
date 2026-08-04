-- classrooms
-- a bookable physical room/resource. Distinct from `classes` (grade+section,
-- e.g. "8A"), since a class does not own a single fixed room in a timetable
-- context (e.g. it may move to a lab for ICT).
CREATE TABLE classrooms (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(50) NOT NULL,
    code       VARCHAR(20),
    capacity   INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_classrooms_name ON classrooms (name);

-- grade_sections
-- a named group of grades for a given academic year (e.g. "Primary",
-- "Junior Secondary"), each with its own interval time and its own section
-- head. This is a separate concept from `section_heads` (a per-grade TIC,
-- see 000014) — a grade can have both a grade-level TIC and belong to a
-- grade_section with its own group-level head; either is authorized to
-- review a timetable for that grade (enforced in application code).
CREATE TABLE grade_sections (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id       UUID        NOT NULL REFERENCES academic_years (id)   ON DELETE CASCADE,
    name                   VARCHAR(50) NOT NULL,
    interval_start_time    TIME        NOT NULL,
    interval_end_time      TIME        NOT NULL,
    section_head_teacher_id UUID       REFERENCES teacher_profiles (id)          ON DELETE SET NULL,
    sort_order             INTEGER     NOT NULL DEFAULT 0,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (interval_start_time < interval_end_time),
    UNIQUE (academic_year_id, name)
);

CREATE INDEX idx_grade_sections_academic_year_id ON grade_sections (academic_year_id);
CREATE INDEX idx_grade_sections_section_head_teacher_id ON grade_sections (section_head_teacher_id);

-- grade_section_grades
-- which grades belong to which grade_section, for a given academic year. A
-- grade belongs to at most one grade_section per year.
CREATE TABLE grade_section_grades (
    grade_section_id UUID NOT NULL REFERENCES grade_sections (id) ON DELETE CASCADE,
    grade_id         UUID NOT NULL REFERENCES grades (id)         ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years (id) ON DELETE CASCADE,
    PRIMARY KEY (grade_section_id, grade_id)
);

CREATE UNIQUE INDEX idx_grade_section_grades_year_grade ON grade_section_grades (academic_year_id, grade_id);

-- timetable_settings
-- one row per academic year: the school's default daily operating time.
-- Used only as a template to pre-fill a grade_section's period grid
-- (timetable_periods) — never consulted directly when scheduling.
CREATE TABLE timetable_settings (
    id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id          UUID        NOT NULL UNIQUE REFERENCES academic_years (id) ON DELETE CASCADE,
    school_start_time         TIME        NOT NULL,
    school_end_time           TIME        NOT NULL,
    number_of_periods         INTEGER     NOT NULL,
    period_duration_minutes   INTEGER     NOT NULL,
    interval_duration_minutes INTEGER     NOT NULL,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (school_start_time < school_end_time),
    CHECK (number_of_periods > 0)
);

-- timetable_periods
-- each grade_section owns its own full period grid (periods + one interval
-- row), since grade sections' interval times don't align to the same
-- clock-time boundaries (see spec 11.3). period_number is NULL for the
-- interval row; sort_order gives the display/chronological order.
CREATE TABLE timetable_periods (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_section_id UUID        NOT NULL REFERENCES grade_sections (id) ON DELETE CASCADE,
    sort_order       INTEGER     NOT NULL,
    period_number    INTEGER,
    start_time       TIME        NOT NULL,
    end_time         TIME        NOT NULL,
    slot_type        VARCHAR(10) NOT NULL DEFAULT 'period',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (start_time < end_time),
    CHECK (slot_type IN ('period', 'interval')),
    CHECK ((slot_type = 'period' AND period_number IS NOT NULL) OR (slot_type = 'interval' AND period_number IS NULL)),
    UNIQUE (grade_section_id, sort_order)
);

CREATE INDEX idx_timetable_periods_grade_section_id ON timetable_periods (grade_section_id);
CREATE UNIQUE INDEX idx_timetable_periods_number_unique
    ON timetable_periods (grade_section_id, period_number)
    WHERE period_number IS NOT NULL;

-- subject_period_requirements
-- admin-defined weekly period count per subject, per grade, per academic
-- year (e.g. Grade 8 Mathematics: 6 periods/week). Applies to every class
-- within that grade.
CREATE TABLE subject_period_requirements (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID        NOT NULL REFERENCES academic_years (id) ON DELETE CASCADE,
    grade_id         UUID        NOT NULL REFERENCES grades (id)         ON DELETE CASCADE,
    subject_id       UUID        NOT NULL REFERENCES subjects (id)       ON DELETE CASCADE,
    periods_per_week INTEGER     NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (periods_per_week > 0),
    UNIQUE (academic_year_id, grade_id, subject_id)
);

CREATE INDEX idx_subject_period_requirements_year_grade ON subject_period_requirements (academic_year_id, grade_id);

-- teacher_availability
-- rows here mark a teacher as UNAVAILABLE for a given day/period; absence
-- of a row means available. Keyed by period_number (not clock time) since
-- grade_sections' grids differ — matches how schools actually describe
-- unavailability ("Monday Period 3").
CREATE TABLE teacher_availability (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id       UUID        NOT NULL REFERENCES teacher_profiles (id) ON DELETE CASCADE,
    academic_year_id UUID        NOT NULL REFERENCES academic_years (id)   ON DELETE CASCADE,
    day_of_week      SMALLINT    NOT NULL,
    period_number    SMALLINT    NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (day_of_week BETWEEN 1 AND 5),
    CHECK (period_number > 0),
    UNIQUE (teacher_id, academic_year_id, day_of_week, period_number)
);

CREATE INDEX idx_teacher_availability_teacher_year ON teacher_availability (teacher_id, academic_year_id);

-- timetables
-- one row per (class, academic year, version). Only one version per class
-- per year may be 'published' at a time (partial unique index below).
-- parent_timetable_id chains a revision back to the published timetable it
-- replaces, for audit/history purposes.
CREATE TABLE timetables (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID        NOT NULL REFERENCES academic_years (id) ON DELETE CASCADE,
    class_id         UUID        NOT NULL REFERENCES classes (id)        ON DELETE CASCADE,
    version          INTEGER     NOT NULL DEFAULT 1,
    status           VARCHAR(20) NOT NULL DEFAULT 'draft',
    parent_timetable_id UUID     REFERENCES timetables (id) ON DELETE SET NULL,
    created_by       UUID        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    submitted_at     TIMESTAMPTZ,
    submitted_by     UUID        REFERENCES users (id) ON DELETE SET NULL,
    reviewed_by      UUID        REFERENCES teacher_profiles (id) ON DELETE SET NULL,
    reviewed_at      TIMESTAMPTZ,
    review_comments  TEXT,
    published_at     TIMESTAMPTZ,
    published_by     UUID        REFERENCES users (id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (status IN ('draft', 'under_review', 'approved', 'published', 'rejected', 'archived')),
    UNIQUE (class_id, academic_year_id, version)
);

CREATE INDEX idx_timetables_class_id ON timetables (class_id);
CREATE INDEX idx_timetables_academic_year_id ON timetables (academic_year_id);
CREATE INDEX idx_timetables_status ON timetables (status);
CREATE UNIQUE INDEX idx_timetables_published_unique
    ON timetables (class_id, academic_year_id)
    WHERE status = 'published';

-- timetable_entries
-- the grid cells of a timetable: one row per (timetable, day, period) that
-- has a subject/teacher/classroom assigned. Interval slots are never
-- stored here — the UI derives them from the class's grade_section's
-- timetable_periods.
CREATE TABLE timetable_entries (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id  UUID        NOT NULL REFERENCES timetables (id)       ON DELETE CASCADE,
    day_of_week   SMALLINT    NOT NULL,
    period_number SMALLINT    NOT NULL,
    subject_id    UUID        REFERENCES subjects (id)                  ON DELETE SET NULL,
    teacher_id    UUID        REFERENCES teacher_profiles (id)          ON DELETE SET NULL,
    classroom_id  UUID        REFERENCES classrooms (id)                ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (day_of_week BETWEEN 1 AND 5),
    CHECK (period_number > 0),
    UNIQUE (timetable_id, day_of_week, period_number)
);

CREATE INDEX idx_timetable_entries_timetable_id ON timetable_entries (timetable_id);
CREATE INDEX idx_timetable_entries_teacher_id ON timetable_entries (teacher_id);
CREATE INDEX idx_timetable_entries_classroom_id ON timetable_entries (classroom_id);

-- timetable_status_history
-- append-only audit trail of every status transition; also the content
-- source for in-app notifications and the spec's "review comments"/version
-- history requirement.
CREATE TABLE timetable_status_history (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID        NOT NULL REFERENCES timetables (id) ON DELETE CASCADE,
    from_status  VARCHAR(20),
    to_status    VARCHAR(20) NOT NULL,
    changed_by   UUID        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    comment      TEXT,
    changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timetable_status_history_timetable_id ON timetable_status_history (timetable_id);

-- timetable_notifications
-- minimal in-app notification record, populated server-side on timetable
-- status transitions (submit/approve/reject/publish). No email/SMS delivery.
CREATE TABLE timetable_notifications (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users (id)      ON DELETE CASCADE,
    timetable_id UUID        REFERENCES timetables (id)          ON DELETE CASCADE,
    type         VARCHAR(30) NOT NULL,
    message      TEXT        NOT NULL,
    is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timetable_notifications_user_id ON timetable_notifications (user_id, is_read);
