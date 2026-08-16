-- name: GetJobSetting :one
SELECT * FROM job_settings WHERE job_name = $1;

-- name: SetJobEnabled :one
INSERT INTO job_settings (job_name, enabled, updated_at)
VALUES ($1, $2, NOW())
ON CONFLICT (job_name) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()
RETURNING *;

-- name: ListJobSettings :many
SELECT * FROM job_settings;

-- name: CreateJobRun :one
INSERT INTO job_runs (job_name, started_at, status)
VALUES ($1, $2, 'running')
RETURNING *;

-- name: FinishJobRun :exec
UPDATE job_runs
SET finished_at = $2, status = $3, summary = $4, findings = $5
WHERE id = $1;

-- name: ListLatestJobRuns :many
-- one row per job_name: its most recent run, for the Automation panel.
SELECT DISTINCT ON (job_name) *
FROM job_runs
ORDER BY job_name, started_at DESC;

-- name: ListJobRunHistory :many
SELECT * FROM job_runs
WHERE job_name = $1
ORDER BY started_at DESC
LIMIT $2;

-- name: PruneJobRuns :exec
-- keeps only the most recent N runs for a job so history never grows
-- unbounded on a job that runs hourly/daily forever.
DELETE FROM job_runs jr
WHERE jr.job_name = $1
AND jr.id NOT IN (
    SELECT id FROM job_runs WHERE job_name = $1 ORDER BY started_at DESC LIMIT $2
);
