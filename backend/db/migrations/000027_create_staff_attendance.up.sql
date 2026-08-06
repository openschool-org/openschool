-- staff_attendance_records
-- Whole-day staff attendance (unlike student attendance, there's no
-- per-class "session" concept for staff — one row per staff member per
-- day). Scoped to either a teacher_profiles row or a non_academic_staff
-- row (Phase 6.1), never both — mirrors the student-attendance status set
-- but swaps 'excused' for 'leave', a genuinely different concept for staff.
CREATE TABLE staff_attendance_records (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id             UUID        REFERENCES teacher_profiles (id)    ON DELETE CASCADE,
    non_academic_staff_id  UUID        REFERENCES non_academic_staff (id) ON DELETE CASCADE,
    date                   DATE        NOT NULL,
    status                 VARCHAR(20) NOT NULL CHECK (status IN ('present', 'late', 'absent', 'leave')),
    marked_by              UUID        REFERENCES users (id) ON DELETE SET NULL,
    note                   TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT staff_attendance_exactly_one_staff CHECK (
        (teacher_id IS NOT NULL AND non_academic_staff_id IS NULL) OR
        (teacher_id IS NULL AND non_academic_staff_id IS NOT NULL)
    )
);

-- one attendance row per staff member per day, whichever staff type
CREATE UNIQUE INDEX idx_staff_attendance_teacher_date
    ON staff_attendance_records (teacher_id, date)
    WHERE teacher_id IS NOT NULL;

CREATE UNIQUE INDEX idx_staff_attendance_non_academic_date
    ON staff_attendance_records (non_academic_staff_id, date)
    WHERE non_academic_staff_id IS NOT NULL;

CREATE INDEX idx_staff_attendance_date   ON staff_attendance_records (date);
CREATE INDEX idx_staff_attendance_status ON staff_attendance_records (status);
