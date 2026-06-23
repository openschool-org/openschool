-- subjects
-- master list of all subjects at the school
CREATE TABLE subjects (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(150) NOT NULL UNIQUE,
    code       VARCHAR(20)  NOT NULL UNIQUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- now that subjects exists, add the FK constraint to class_subject_teachers
ALTER TABLE class_subject_teachers
    ADD CONSTRAINT fk_cst_subject
    FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE RESTRICT;

-- grade_subjects
-- which subjects are offered at which grade
-- prevents assigning a subject to a class if that grade doesn't offer it
CREATE TABLE grade_subjects (
    grade_id   UUID NOT NULL REFERENCES grades (id)   ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects (id) ON DELETE CASCADE,
    PRIMARY KEY (grade_id, subject_id)
);

CREATE INDEX idx_grade_subjects_grade_id   ON grade_subjects (grade_id);
CREATE INDEX idx_grade_subjects_subject_id ON grade_subjects (subject_id);

-- teacher_subjects
-- school-wide qualification: which subjects a teacher handles
-- powers the "filter teachers by subject" query
CREATE TABLE teacher_subjects (
    teacher_id UUID NOT NULL REFERENCES teacher_profiles (id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects (id)         ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, subject_id)
);

CREATE INDEX idx_teacher_subjects_teacher_id ON teacher_subjects (teacher_id);
CREATE INDEX idx_teacher_subjects_subject_id ON teacher_subjects (subject_id);

-- subject_buckets
-- elective choice groups per grade (e.g. "Elective Group A for Grade 10")
-- only relevant for grades that have elective subjects
CREATE TABLE subject_buckets (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id   UUID         NOT NULL REFERENCES grades (id) ON DELETE CASCADE,
    name       VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (grade_id, name)
);

CREATE INDEX idx_subject_buckets_grade_id ON subject_buckets (grade_id);

-- subject_bucket_options
-- which subjects are available to pick from in a bucket
CREATE TABLE subject_bucket_options (
    bucket_id  UUID NOT NULL REFERENCES subject_buckets (id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects (id)        ON DELETE CASCADE,
    PRIMARY KEY (bucket_id, subject_id)
);

CREATE INDEX idx_sbo_bucket_id  ON subject_bucket_options (bucket_id);
CREATE INDEX idx_sbo_subject_id ON subject_bucket_options (subject_id);

-- student_subject_selections
-- what each student chose from each elective bucket
-- subject_id must be one of the options in that bucket — enforced at app level
CREATE TABLE student_subject_selections (
    student_id UUID NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    bucket_id  UUID NOT NULL REFERENCES subject_buckets (id)  ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects (id)         ON DELETE RESTRICT,
    PRIMARY KEY (student_id, bucket_id),
    -- subject chosen must be a valid option in that bucket
    -- full validation done at application level
    UNIQUE (student_id, bucket_id)
);

CREATE INDEX idx_sss_student_id ON student_subject_selections (student_id);
CREATE INDEX idx_sss_bucket_id  ON student_subject_selections (bucket_id);
CREATE INDEX idx_sss_subject_id ON student_subject_selections (subject_id);
