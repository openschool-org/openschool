-- Year-end workflows (docs/finfix/AUTOMATION_AND_FIXES_PLAN.md, Part B): each run is a
-- deterministic proposal a person reviews, edits and applies. snapshot holds what apply
-- changed so a run can be reverted; trace records every step and the tool it used.
CREATE TABLE workflow_runs (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_key VARCHAR(50)  NOT NULL,
    scope_key    VARCHAR(100) NOT NULL DEFAULT '',
    state        VARCHAR(20)  NOT NULL CHECK (state IN ('proposed', 'applied', 'failed', 'reverted', 'discarded')),
    inputs       JSONB        NOT NULL DEFAULT '{}',
    proposal     JSONB        NOT NULL,
    trace        JSONB        NOT NULL DEFAULT '[]',
    snapshot     JSONB,
    summary      TEXT,
    error        TEXT,
    created_by   UUID         REFERENCES users (id) ON DELETE SET NULL,
    applied_by   UUID         REFERENCES users (id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    applied_at   TIMESTAMPTZ,
    reverted_at  TIMESTAMPTZ
);

-- One open proposal per workflow and scope (usually the target academic year).
CREATE UNIQUE INDEX idx_workflow_runs_one_open
    ON workflow_runs (workflow_key, scope_key) WHERE state = 'proposed';
CREATE INDEX idx_workflow_runs_key_created ON workflow_runs (workflow_key, created_at DESC);
