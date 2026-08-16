package models

import "time"

// JobLastRun is the most recent execution of a background job, for the
// admin Automation panel.
type JobLastRun struct {
	Status     string     `json:"status"`
	Summary    string     `json:"summary"`
	Findings   int32      `json:"findings"`
	StartedAt  time.Time  `json:"started_at"`
	FinishedAt *time.Time `json:"finished_at,omitempty"`
}

// JobStatus is one registered background job's static definition plus its
// current on/off state and last run, if any.
type JobStatus struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Schedule    string      `json:"schedule"`
	Enabled     bool        `json:"enabled"`
	LastRun     *JobLastRun `json:"last_run,omitempty"`
}

type SetJobEnabledRequest struct {
	Enabled bool `json:"enabled"`
}
