// Package jobs holds the scheduled, read-mostly maintenance/ops agents
// described in docs/plan.md § Proposed — maintenance/ops agents: built-in
// background checks (backup, data-invariant scans, stale-record watchers,
// …) that support the system's operation without any user-facing feature
// depending on them. None of the app's other code imports this package —
// it's wired in exactly once, from routes.Setup.
//
// Structure, one job per file:
//   - job.go       — the Job contract every agent implements (this file)
//   - registry.go  — BuildAll, the single place that lists every job
//   - scheduler.go — the generic cron runner + job_runs bookkeeping
//   - system.go    — shared helpers (resolving a "system" actor, notifying admins)
//   - <name>.go    — one job's actual check/action, self-contained
//
// Adding a new job means adding one <name>.go file implementing Job, plus
// one line in registry.go's BuildAll — nothing else in the framework
// changes.
package jobs

import "context"

// Result is what a job reports back after running, independent of whether
// anything was actually wrong — Findings lets the Automation panel show
// "3 issues found" without parsing Summary text.
type Result struct {
	Summary  string
	Findings int
}

// Job is a single scheduled maintenance check or action. Run must be safe
// to call concurrently with itself only in the sense that the scheduler
// guarantees it won't be — each job runs to completion before its next
// scheduled tick fires (see scheduler.go) — but must NOT assume anything
// about which other jobs are running alongside it.
type Job interface {
	// Name is the stable identifier stored in job_settings/job_runs and
	// shown in the admin Automation panel. Renaming it orphans any existing
	// history/settings row, so treat it as an on-disk identifier once shipped.
	Name() string

	// Schedule is a standard 5-field cron expression (robfig/cron/v3,
	// minute-level granularity, no seconds field).
	Schedule() string

	// Description is a one-line, human-readable explanation shown in the
	// admin Automation panel next to the on/off toggle.
	Description() string

	Run(ctx context.Context) (Result, error)
}
