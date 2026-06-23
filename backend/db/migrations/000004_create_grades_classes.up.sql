-- grades
-- school defines their own grade range (1-11 or 1-13 etc.)
CREATE TABLE grades (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL UNIQUE,
    sort_order INT          NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- streams
-- A/L streams: Science, Commerce, Arts, Technology
-- school-defined, optional — only relevant for Grade 12/13
CREATE TABLE streams (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- stream_groups
-- sub-streams under a stream: Bio, Maths under Science
-- Commerce and Arts have no sub-streams
CREATE TABLE stream_groups (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id  UUID         NOT NULL REFERENCES streams (id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (stream_id, name)
);

CREATE INDEX idx_stream_groups_stream_id ON stream_groups (stream_id);

-- classes
-- a grade in a specific academic year with a section name
-- stream_id and stream_group_id are nullable — only set for A/L classes
-- form_teacher_id is nullable — not every class needs one assigned immediately
CREATE TABLE classes (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id         UUID         NOT NULL REFERENCES grades (id)         ON DELETE RESTRICT,
    academic_year_id UUID         NOT NULL REFERENCES academic_years (id) ON DELETE RESTRICT,
    form_teacher_id  UUID         REFERENCES teacher_profiles (id)        ON DELETE SET NULL,
    stream_id        UUID         REFERENCES streams (id)                 ON DELETE RESTRICT,
    stream_group_id  UUID         REFERENCES stream_groups (id)           ON DELETE RESTRICT,
    name             VARCHAR(20)  NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (grade_id, academic_year_id, name),
    -- if stream_group_id is set, stream_id must also be set
    CHECK (stream_group_id IS NULL OR stream_id IS NOT NULL)
);

CREATE INDEX idx_classes_grade_id         ON classes (grade_id);
CREATE INDEX idx_classes_academic_year_id ON classes (academic_year_id);
CREATE INDEX idx_classes_form_teacher_id  ON classes (form_teacher_id);
CREATE INDEX idx_classes_stream_id        ON classes (stream_id);

-- class_students
-- enrollment: student assigned to a class for a year
-- a student should only be in one class per academic year
-- enforced via unique index through the class's academic_year_id
CREATE TABLE class_students (
    class_id    UUID        NOT NULL REFERENCES classes (id)          ON DELETE CASCADE,
    student_id  UUID        NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (class_id, student_id)
);

CREATE INDEX idx_class_students_student_id ON class_students (student_id);
CREATE INDEX idx_class_students_class_id   ON class_students (class_id);

-- class_subject_teachers
-- who teaches which subject to which class
-- unique on (class_id, subject_id): one teacher per subject per class
-- teacher_id references teacher_profiles, added after subjects migration
CREATE TABLE class_subject_teachers (
    class_id    UUID NOT NULL REFERENCES classes (id)          ON DELETE CASCADE,
    subject_id  UUID NOT NULL,
    teacher_id  UUID NOT NULL REFERENCES teacher_profiles (id) ON DELETE RESTRICT,
    PRIMARY KEY (class_id, subject_id),
    UNIQUE (class_id, subject_id)
);

CREATE INDEX idx_cst_teacher_id ON class_subject_teachers (teacher_id);
CREATE INDEX idx_cst_subject_id ON class_subject_teachers (subject_id);
