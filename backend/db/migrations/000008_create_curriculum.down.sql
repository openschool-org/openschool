-- Tear down the curriculum engine and restore the previous grade-bound model
-- (structure only — the seed data it once carried is not restored).

DROP TABLE IF EXISTS student_subject_enrollments;
DROP TABLE IF EXISTS group_subjects;
DROP TABLE IF EXISTS selection_groups;
DROP TABLE IF EXISTS levels;
DROP TABLE IF EXISTS mediums;

ALTER TABLE school DROP CONSTRAINT IF EXISTS school_grade_range_check;
ALTER TABLE school DROP COLUMN IF EXISTS grade_to;
ALTER TABLE school DROP COLUMN IF EXISTS grade_from;

ALTER TABLE subjects DROP COLUMN IF EXISTS type;

CREATE TABLE grade_subjects (
    grade_id   UUID NOT NULL REFERENCES grades (id)   ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects (id) ON DELETE CASCADE,
    PRIMARY KEY (grade_id, subject_id)
);

CREATE INDEX idx_grade_subjects_grade_id   ON grade_subjects (grade_id);
CREATE INDEX idx_grade_subjects_subject_id ON grade_subjects (subject_id);

CREATE TABLE subject_buckets (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id   UUID         NOT NULL REFERENCES grades (id) ON DELETE CASCADE,
    name       VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (grade_id, name)
);

CREATE INDEX idx_subject_buckets_grade_id ON subject_buckets (grade_id);

CREATE TABLE subject_bucket_options (
    bucket_id  UUID NOT NULL REFERENCES subject_buckets (id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects (id)        ON DELETE CASCADE,
    PRIMARY KEY (bucket_id, subject_id)
);

CREATE INDEX idx_sbo_bucket_id  ON subject_bucket_options (bucket_id);
CREATE INDEX idx_sbo_subject_id ON subject_bucket_options (subject_id);

CREATE TABLE student_subject_selections (
    student_id UUID NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    bucket_id  UUID NOT NULL REFERENCES subject_buckets (id)  ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects (id)         ON DELETE RESTRICT,
    PRIMARY KEY (student_id, bucket_id),
    UNIQUE (student_id, bucket_id)
);

CREATE INDEX idx_sss_student_id ON student_subject_selections (student_id);
CREATE INDEX idx_sss_bucket_id  ON student_subject_selections (bucket_id);
CREATE INDEX idx_sss_subject_id ON student_subject_selections (subject_id);
