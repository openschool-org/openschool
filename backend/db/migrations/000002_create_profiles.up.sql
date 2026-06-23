-- student_profiles
CREATE TABLE student_profiles (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        UNIQUE REFERENCES users (id) ON DELETE SET NULL,
    full_name        VARCHAR(255) NOT NULL,
    index_number     VARCHAR(50)  NOT NULL UNIQUE,
    address          TEXT,
    phone            VARCHAR(30),
    whatsapp         VARCHAR(30),
    special_remarks  TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_profiles_user_id      ON student_profiles (user_id);
CREATE INDEX idx_student_profiles_index_number ON student_profiles (index_number);

-- teacher_profiles
CREATE TABLE teacher_profiles (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL UNIQUE REFERENCES users (id) ON DELETE RESTRICT,
    full_name       VARCHAR(255) NOT NULL,
    employee_number VARCHAR(50)  NOT NULL UNIQUE,
    joined_date     DATE         NOT NULL,
    phone           VARCHAR(30),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teacher_profiles_user_id ON teacher_profiles (user_id);

-- guardians
-- user_id is nullable — filled later when parent portal access is granted
CREATE TABLE guardians (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         UNIQUE REFERENCES users (id) ON DELETE SET NULL,
    full_name    VARCHAR(255) NOT NULL,
    relationship VARCHAR(50)  NOT NULL CHECK (relationship IN ('father', 'mother', 'guardian', 'other')),
    phone        VARCHAR(30)  NOT NULL,
    email        VARCHAR(255),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guardians_user_id ON guardians (user_id);

-- student_guardians
-- junction: one student can have multiple guardians
-- one guardian can be linked to multiple students (siblings case)
CREATE TABLE student_guardians (
    student_id          UUID    NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    guardian_id         UUID    NOT NULL REFERENCES guardians (id)         ON DELETE CASCADE,
    is_primary_contact  BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (student_id, guardian_id)
);

CREATE INDEX idx_student_guardians_student_id  ON student_guardians (student_id);
CREATE INDEX idx_student_guardians_guardian_id ON student_guardians (guardian_id);

-- student_siblings
-- self-referencing junction on student_profiles
-- store one row per pair, always with student_id_1 < student_id_2 to avoid duplicates
CREATE TABLE student_siblings (
    student_id_1  UUID NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    student_id_2  UUID NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    PRIMARY KEY (student_id_1, student_id_2),
    CHECK (student_id_1 < student_id_2)
);
