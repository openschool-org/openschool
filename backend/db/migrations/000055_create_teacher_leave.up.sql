-- teacher_leave_requests
-- A teacher's leave application, modelled on the Sri Lankan government
-- school workflow: the teacher applies (before the leave, or on the day
-- for short / half-day leave), names relief teachers for the periods they
-- will miss, and the Principal or a Vice Principal approves or rejects it.
-- Approved rows are the school's leave register; balances are derived from
-- them per calendar year, so there is no separate balance table to drift.
--
-- days is the number of working days (Mon-Fri) charged: 0.5 for a half
-- day, 0 for short leave, which is counted per month instead.
CREATE TABLE teacher_leave_requests (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id        UUID         NOT NULL REFERENCES teacher_profiles (id) ON DELETE CASCADE,
    leave_type        VARCHAR(20)  NOT NULL CHECK (leave_type IN ('casual', 'sick', 'duty', 'maternity', 'no_pay', 'short')),
    start_date        DATE         NOT NULL,
    end_date          DATE         NOT NULL,
    day_part          VARCHAR(10)  NOT NULL DEFAULT 'full' CHECK (day_part IN ('full', 'morning', 'afternoon')),
    start_time        TIME,
    end_time          TIME,
    days              NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (days >= 0),
    reason            TEXT         NOT NULL,
    acting_teacher_id UUID         REFERENCES teacher_profiles (id) ON DELETE SET NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    decided_by        UUID         REFERENCES users (id) ON DELETE SET NULL,
    decided_at        TIMESTAMPTZ,
    decision_note     TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (start_date <= end_date),
    -- leave never spans two leave years, so each row charges exactly one year's balance
    CHECK (EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM end_date)),
    CHECK (day_part = 'full' OR start_date = end_date),
    CHECK ((leave_type = 'short') = (start_time IS NOT NULL AND end_time IS NOT NULL)),
    CHECK (leave_type <> 'short' OR (start_date = end_date AND day_part = 'full')),
    CHECK (start_time IS NULL OR start_time < end_time),
    CHECK (acting_teacher_id IS NULL OR acting_teacher_id <> teacher_id)
);

CREATE INDEX idx_teacher_leave_requests_teacher_dates ON teacher_leave_requests (teacher_id, start_date, end_date);
CREATE INDEX idx_teacher_leave_requests_status ON teacher_leave_requests (status);
CREATE INDEX idx_teacher_leave_requests_acting_teacher_id ON teacher_leave_requests (acting_teacher_id);

-- teacher_leave_relief
-- The relief arrangement written on the leave form: for each timetable
-- period the teacher will miss, which colleague takes the class. A row
-- without a relief teacher is a period the approver still has to cover.
CREATE TABLE teacher_leave_relief (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_request_id  UUID        NOT NULL REFERENCES teacher_leave_requests (id) ON DELETE CASCADE,
    date              DATE        NOT NULL,
    period_number     SMALLINT    NOT NULL CHECK (period_number > 0),
    class_id          UUID        NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    subject_id        UUID        REFERENCES subjects (id) ON DELETE SET NULL,
    relief_teacher_id UUID        REFERENCES teacher_profiles (id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (leave_request_id, date, period_number, class_id)
);

CREATE INDEX idx_teacher_leave_relief_date ON teacher_leave_relief (date, period_number);
CREATE INDEX idx_teacher_leave_relief_teacher_date ON teacher_leave_relief (relief_teacher_id, date);
CREATE INDEX idx_teacher_leave_relief_class_id ON teacher_leave_relief (class_id);
CREATE INDEX idx_teacher_leave_relief_subject_id ON teacher_leave_relief (subject_id);
