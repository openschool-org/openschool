-- Sri Lankan model: students stay in one fixed homeroom all day (teachers
-- rotate in); some periods happen in a subject-tagged lab or an ECA room
-- instead. Supports the timetable auto-generator.
ALTER TABLE classrooms ADD COLUMN room_type VARCHAR(10) NOT NULL DEFAULT 'regular'
    CHECK (room_type IN ('regular', 'lab', 'eca'));
ALTER TABLE classrooms ADD COLUMN subject_id UUID REFERENCES subjects (id) ON DELETE SET NULL;
CREATE INDEX idx_classrooms_subject_id ON classrooms (subject_id) WHERE subject_id IS NOT NULL;

ALTER TABLE classes ADD COLUMN home_classroom_id UUID REFERENCES classrooms (id) ON DELETE SET NULL;
CREATE INDEX idx_classes_home_classroom_id ON classes (home_classroom_id);

ALTER TABLE subject_period_requirements ADD COLUMN lab_periods_per_week INTEGER NOT NULL DEFAULT 0
    CHECK (lab_periods_per_week >= 0);
