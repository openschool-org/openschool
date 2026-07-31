CREATE TABLE houses (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL UNIQUE,
    code       VARCHAR(20),
    remainder  INT          NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE student_profiles
    ADD COLUMN house_id UUID REFERENCES houses (id) ON DELETE SET NULL;

CREATE INDEX idx_student_profiles_house_id ON student_profiles (house_id);
