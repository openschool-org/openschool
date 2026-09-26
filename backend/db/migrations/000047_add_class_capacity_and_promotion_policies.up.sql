-- Class formation balances sizes against this; 45 is the school-wide default.
ALTER TABLE classes ADD COLUMN capacity INT NOT NULL DEFAULT 45 CHECK (capacity > 0);

-- A/L levels name the stream they belong to, so a student's subject enrolment in
-- that level tells the promotion workflow which stream class to place them in.
ALTER TABLE levels
    ADD COLUMN stream_id       UUID REFERENCES streams (id) ON DELETE SET NULL,
    ADD COLUMN stream_group_id UUID REFERENCES stream_groups (id) ON DELETE SET NULL;

-- How students move from one grade to the next. No row means keep_section.
CREATE TABLE promotion_policies (
    from_grade_id UUID        PRIMARY KEY REFERENCES grades (id) ON DELETE CASCADE,
    policy        VARCHAR(30) NOT NULL CHECK (policy IN ('keep_section', 'balanced_reshuffle', 'by_subject_choice', 'by_stream', 'graduate')),
    spread_by_marks BOOLEAN   NOT NULL DEFAULT FALSE,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
