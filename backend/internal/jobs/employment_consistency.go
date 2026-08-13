package jobs

import (
	"context"
	"fmt"
	"strings"

	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services/notifications"
)

const EmploymentConsistencyJobName = "employment_status_consistency"

// EmploymentConsistencyJob is § Proposed — maintenance/ops agents item 4
// (docs/plan.md): a teacher can be resigned/transferred while still wired
// in as a form teacher or subject teacher — nothing today re-checks those
// assignments when status changes, so attendance/marks/notifications keep
// routing to someone who's left.
type EmploymentConsistencyJob struct {
	checks   *repositories.JobChecksRepository
	notifSvc *notifications.NotificationService
}

func NewEmploymentConsistencyJob(checks *repositories.JobChecksRepository, notifSvc *notifications.NotificationService) *EmploymentConsistencyJob {
	return &EmploymentConsistencyJob{checks: checks, notifSvc: notifSvc}
}

func (j *EmploymentConsistencyJob) Name() string     { return EmploymentConsistencyJobName }
func (j *EmploymentConsistencyJob) Schedule() string { return "0 5 * * *" } // daily 05:00
func (j *EmploymentConsistencyJob) Description() string {
	return "Flags resigned/transferred teachers still assigned as a form teacher or subject teacher on a current-year class."
}

func (j *EmploymentConsistencyJob) Run(ctx context.Context) (Result, error) {
	teachers, err := j.checks.ListInactiveTeachersStillAssigned(ctx)
	if err != nil {
		return Result{}, err
	}
	if len(teachers) == 0 {
		return Result{Summary: "no resigned/transferred teacher is still assigned to a current-year class", Findings: 0}, nil
	}

	names := make([]string, len(teachers))
	for i, t := range teachers {
		names[i] = fmt.Sprintf("%s (%s)", t.FullName, t.EmploymentStatus)
	}
	summary := fmt.Sprintf("%d teacher(s) still assigned despite employment status: %s", len(teachers), strings.Join(names, ", "))

	if err := notifyAdmins(ctx, j.checks, j.notifSvc, "Inactive teachers still assigned to classes",
		summary, "general"); err != nil {
		return Result{Summary: summary, Findings: len(teachers)}, fmt.Errorf("found %d teacher(s) but failed to notify admins: %w", len(teachers), err)
	}
	return Result{Summary: summary, Findings: len(teachers)}, nil
}
