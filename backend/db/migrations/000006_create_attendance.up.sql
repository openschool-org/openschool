-- attendance_sessions
-- one session per class per day
-- taken_by is the teacher who marked the attendance
CREATE TABLE attendance_sessions (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id   UUID        NOT NULL REFERENCES classes (id)          ON DELETE CASCADE,
    taken_by   UUID        NOT NULL REFERENCES teacher_profiles (id) ON DELETE RESTRICT,
    date       DATE        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (class_id, date)
);

CREATE INDEX idx_attendance_sessions_class_id ON attendance_sessions (class_id);
CREATE INDEX idx_attendance_sessions_date     ON attendance_sessions (date);
CREATE INDEX idx_attendance_sessions_taken_by ON attendance_sessions (taken_by);

-- attendance_records
-- one row per student per session
-- status: present, absent, late, excused
CREATE TABLE attendance_records (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID        NOT NULL REFERENCES attendance_sessions (id) ON DELETE CASCADE,
    student_id UUID        NOT NULL REFERENCES student_profiles (id)    ON DELETE CASCADE,
    status     VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    note       TEXT,
    UNIQUE (session_id, student_id)
);

CREATE INDEX idx_attendance_records_session_id ON attendance_records (session_id);
CREATE INDEX idx_attendance_records_student_id ON attendance_records (student_id);
CREATE INDEX idx_attendance_records_status     ON attendance_records (status);
