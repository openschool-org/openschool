-- school
-- single row for the self-hosted instance
CREATE TABLE school (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL,
    address    TEXT,
    phone      VARCHAR(30),
    email      VARCHAR(255),
    logo_url   TEXT,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- academic_years
-- all academic data (classes, attendance) scopes to a year
-- only one row should have is_current = TRUE at any time
-- enforced at application level
CREATE TABLE academic_years (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    label      VARCHAR(50) NOT NULL UNIQUE,
    start_date DATE        NOT NULL,
    end_date   DATE        NOT NULL,
    is_current BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (start_date < end_date)
);

CREATE INDEX idx_academic_years_is_current ON academic_years (is_current);
