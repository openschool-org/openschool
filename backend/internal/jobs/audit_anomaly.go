package jobs

import (
	"context"
	"fmt"
	"strings"

	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services/notifications"
)

const AuditAnomalyJobName = "audit_log_anomaly_watcher"

// burstThreshold is the fixed-count heuristic this job uses: more than this
// many audit-logged changes by one actor within an hour is unusual enough
// to flag. docs/plan.md notes this job needs real heuristics/thresholds to
// design — a fixed threshold is the simplest defensible starting point,
// not a claim that it's statistically tuned.
const burstThreshold = 50

// AuditAnomalyJob is § Proposed — maintenance/ops agents item 9
// (docs/plan.md): audit_logs already captures actor/before/after for
// house/attendance/account/position changes, but nothing alerts on unusual
// volume from one account in a short window.
type AuditAnomalyJob struct {
	checks   *repositories.JobChecksRepository
	notifSvc *notifications.NotificationService
}

func NewAuditAnomalyJob(checks *repositories.JobChecksRepository, notifSvc *notifications.NotificationService) *AuditAnomalyJob {
	return &AuditAnomalyJob{checks: checks, notifSvc: notifSvc}
}

func (j *AuditAnomalyJob) Name() string     { return AuditAnomalyJobName }
func (j *AuditAnomalyJob) Schedule() string { return "0 * * * *" } // hourly
func (j *AuditAnomalyJob) Description() string {
	return "Flags any account with more than 50 audit-logged changes in the last hour — a possible compromised account or runaway script."
}

func (j *AuditAnomalyJob) Run(ctx context.Context) (Result, error) {
	actors, err := j.checks.ListBurstAuditActors(ctx, burstThreshold)
	if err != nil {
		return Result{}, err
	}
	if len(actors) == 0 {
		return Result{Summary: "no unusual audit-log activity in the last hour", Findings: 0}, nil
	}

	descriptions := make([]string, len(actors))
	for i, a := range actors {
		descriptions[i] = fmt.Sprintf("%s: %d changes", a.FullName, a.ChangeCount)
	}
	summary := fmt.Sprintf("%d account(s) with unusually high activity in the last hour: %s", len(actors), strings.Join(descriptions, ", "))

	if err := notifyAdmins(ctx, j.checks, j.notifSvc, "Unusual audit-log activity",
		summary, "emergency"); err != nil {
		return Result{Summary: summary, Findings: len(actors)}, fmt.Errorf("found %d account(s) but failed to notify admins: %w", len(actors), err)
	}
	return Result{Summary: summary, Findings: len(actors)}, nil
}
