package jobs

import (
	"context"
	"fmt"
	"strings"

	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services/notifications"
)

const EmptyGradeJobName = "empty_grade_watcher"

// EmptyGradeJob is a new check (not in the original 10-item proposal),
// added for the Grades page: a grade defined in the curriculum with zero
// classes in the current academic year — either never set up after
// creation, or every class under it was deleted without anyone noticing
// the grade itself was left dangling.
type EmptyGradeJob struct {
	checks   *repositories.JobChecksRepository
	notifSvc *notifications.NotificationService
}

func NewEmptyGradeJob(checks *repositories.JobChecksRepository, notifSvc *notifications.NotificationService) *EmptyGradeJob {
	return &EmptyGradeJob{checks: checks, notifSvc: notifSvc}
}

func (j *EmptyGradeJob) Name() string     { return EmptyGradeJobName }
func (j *EmptyGradeJob) Schedule() string { return "0 4 * * 1" } // weekly, Monday 04:00
func (j *EmptyGradeJob) Description() string {
	return "Flags grades with zero classes in the current academic year."
}

func (j *EmptyGradeJob) Run(ctx context.Context) (Result, error) {
	grades, err := j.checks.ListGradesWithNoCurrentClasses(ctx)
	if err != nil {
		return Result{}, err
	}
	if len(grades) == 0 {
		return Result{Summary: "every grade has at least one class this year", Findings: 0}, nil
	}

	names := make([]string, len(grades))
	for i, g := range grades {
		names[i] = g.Name
	}
	summary := fmt.Sprintf("%d grade(s) with no classes this year: %s", len(grades), strings.Join(names, ", "))

	if err := notifyAdmins(ctx, j.checks, j.notifSvc, "Grades with no current-year classes",
		summary, "general"); err != nil {
		return Result{Summary: summary, Findings: len(grades)}, fmt.Errorf("found %d grade(s) but failed to notify admins: %w", len(grades), err)
	}
	return Result{Summary: summary, Findings: len(grades)}, nil
}
