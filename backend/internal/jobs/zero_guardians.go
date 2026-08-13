package jobs

import (
	"context"
	"fmt"
	"strings"

	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services/notifications"
)

const ZeroGuardianJobName = "zero_guardian_watcher"

// ZeroGuardianJob is § Proposed — maintenance/ops agents item 3
// (docs/plan.md): student_guardians has no constraint requiring at least
// one linked guardian, and the absence-notification path silently no-ops
// when a student has none on file — nothing today surfaces that fact.
type ZeroGuardianJob struct {
	checks   *repositories.JobChecksRepository
	notifSvc *notifications.NotificationService
}

func NewZeroGuardianJob(checks *repositories.JobChecksRepository, notifSvc *notifications.NotificationService) *ZeroGuardianJob {
	return &ZeroGuardianJob{checks: checks, notifSvc: notifSvc}
}

func (j *ZeroGuardianJob) Name() string     { return ZeroGuardianJobName }
func (j *ZeroGuardianJob) Schedule() string { return "0 4 * * 1" } // weekly, Monday 04:00
func (j *ZeroGuardianJob) Description() string {
	return "Flags active students with zero guardians on file — they never trigger an absence alert, and nothing else surfaces that gap."
}

func (j *ZeroGuardianJob) Run(ctx context.Context) (Result, error) {
	students, err := j.checks.ListActiveStudentsWithoutGuardian(ctx)
	if err != nil {
		return Result{}, err
	}
	if len(students) == 0 {
		return Result{Summary: "every active student has at least one guardian on file", Findings: 0}, nil
	}

	names := make([]string, len(students))
	for i, s := range students {
		names[i] = fmt.Sprintf("%s (%s)", s.FullName, s.IndexNumber)
	}
	summary := fmt.Sprintf("%d active student(s) with no guardian on file: %s", len(students), strings.Join(names, ", "))

	if err := notifyAdmins(ctx, j.checks, j.notifSvc, "Students with no guardian on file",
		summary, "general"); err != nil {
		return Result{Summary: summary, Findings: len(students)}, fmt.Errorf("found %d student(s) but failed to notify admins: %w", len(students), err)
	}
	return Result{Summary: summary, Findings: len(students)}, nil
}
