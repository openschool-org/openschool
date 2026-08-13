-- job_settings: on/off switch per background job. A job with no row here is
-- treated as enabled (see internal/jobs) — new jobs need no seed migration
-- to start running, only an explicit row once someone disables one.
CREATE TABLE job_settings (
    job_name   VARCHAR(100) PRIMARY KEY,
    enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- job_runs: execution history, so the admin Automation panel has something
-- real to show ("last ran when, found what") instead of a bare on/off
-- toggle with no feedback. Pruned to the most recent rows per job (see
-- internal/repositories/job_scheduler.go) so this never grows unbounded.
CREATE TABLE job_runs (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name    VARCHAR(100) NOT NULL,
    started_at  TIMESTAMPTZ  NOT NULL,
    finished_at TIMESTAMPTZ,
    status      VARCHAR(20)  NOT NULL CHECK (status IN ('running', 'ok', 'failed')),
    summary     TEXT,
    findings    INT          NOT NULL DEFAULT 0
);

CREATE INDEX idx_job_runs_job_name_started_at ON job_runs (job_name, started_at DESC);
