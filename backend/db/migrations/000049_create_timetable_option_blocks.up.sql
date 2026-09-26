-- Option blocks: basket and A/L option subjects that run at the same period across the
-- classes that share them. In a block period each class's students split up by subject,
-- so the class timetable holds one entry pointing at the block instead of one subject.
CREATE TABLE timetable_option_blocks (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID         NOT NULL REFERENCES academic_years (id) ON DELETE CASCADE,
    grade_id         UUID         NOT NULL REFERENCES grades (id)         ON DELETE CASCADE,
    name             VARCHAR(150) NOT NULL,
    periods_per_week INT          NOT NULL CHECK (periods_per_week > 0),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (academic_year_id, grade_id, name)
);

CREATE TABLE timetable_option_block_subjects (
    block_id   UUID NOT NULL REFERENCES timetable_option_blocks (id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects (id)                ON DELETE CASCADE,
    PRIMARY KEY (block_id, subject_id)
);

CREATE TABLE timetable_option_block_classes (
    block_id UUID NOT NULL REFERENCES timetable_option_blocks (id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes (id)                 ON DELETE CASCADE,
    PRIMARY KEY (block_id, class_id)
);

CREATE INDEX idx_option_block_classes_class ON timetable_option_block_classes (class_id);

-- A block entry has no subject or teacher of its own; its teachers are the class's
-- subject teachers for the block's subjects.
ALTER TABLE timetable_entries
    ADD COLUMN option_block_id UUID REFERENCES timetable_option_blocks (id) ON DELETE CASCADE;

CREATE INDEX idx_timetable_entries_option_block ON timetable_entries (option_block_id);
