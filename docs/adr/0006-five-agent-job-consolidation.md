# 0006. Five consolidated background agents instead of many single-purpose jobs

**Status:** Accepted

## Context

`internal/jobs` grew to 15 single-purpose scheduled jobs, each one check.
They were kept narrow deliberately: a job that bundled unrelated checks
into one summary couldn't be shown correctly on a specific admin page,
only in the general Automation panel. That gave good per-page precision,
at the cost of 15 separate cron entries, `job_settings`/`job_runs` rows,
and duplicated scheduling/notification boilerplate.

## Decision

Consolidate into five domain-grouped agents - `structural_integrity_agent`,
`people_compliance_agent`, `academic_delivery_agent`, `security_audit_agent`,
`system_health_agent` - each running its checks concurrently (`runChecks`,
goroutines + `sync.WaitGroup`). Each check still sends its own titled,
categorized notification exactly as before; the frontend's
`AgentFindingsBanner` now matches on that notification title instead of
job identity, so per-page precision is preserved without one job per page.
Several new checks (statistical audit-log anomaly detection, attendance
compliance rate, term-marks pace, backup retention pruning, backup
size-anomaly detection) were added during the same pass.

## Consequences

- The Automation panel shows 5 rows instead of 15, each with an aggregate
  summary - less granular at the top level, though the underlying
  notifications stay per-check.
- Disabling an agent disables all its checks together; a school can't turn
  off one check within a domain without a code change.
- A new check for an existing concern is a method on that domain's agent,
  not a new file wired into the scheduler - fewer places to wire up, but
  larger agent files.
- **Update (v0.3.0):** two more agents were added on the same pattern,
  `data_retention_agent` and `identity_erasure_retry_agent`, so there are
  now seven. The security audit agent's link sweep also removes expired
  activation links. Year-end workflows are listed beside the agents on the
  Automation page but are run by an admin, not on a schedule.
