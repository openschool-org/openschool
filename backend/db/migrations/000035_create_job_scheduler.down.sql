-- WARNING: destructive — discards every job on/off setting (jobs revert to
-- their enabled-by-default state) and all job run history.
DROP TABLE IF EXISTS job_runs;
DROP TABLE IF EXISTS job_settings;
