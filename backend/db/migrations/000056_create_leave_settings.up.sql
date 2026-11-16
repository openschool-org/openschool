-- leave_settings: single row of leave limits an administrator can change.
-- Defaults are the public service scheme in docs/adr/0010-teacher-leave-rules.md.
CREATE TABLE leave_settings (
    id                      BOOLEAN     PRIMARY KEY DEFAULT TRUE CHECK (id),
    casual_days_per_year    INT         NOT NULL DEFAULT 21 CHECK (casual_days_per_year BETWEEN 0 AND 366),
    sick_days_per_year      INT         NOT NULL DEFAULT 20 CHECK (sick_days_per_year BETWEEN 0 AND 366),
    short_leaves_per_month  INT         NOT NULL DEFAULT 2  CHECK (short_leaves_per_month BETWEEN 0 AND 31),
    short_leave_max_minutes INT         NOT NULL DEFAULT 90 CHECK (short_leave_max_minutes BETWEEN 15 AND 480),
    maternity_days          INT         NOT NULL DEFAULT 84 CHECK (maternity_days BETWEEN 1 AND 366),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO leave_settings DEFAULT VALUES;
