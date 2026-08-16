package jobs

import (
	"context"
	"fmt"
	"strings"

	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services/notifications"
)

const UnclassedStudentJobName = "unclassed_student_watcher"

// UnclassedStudentJob is the last third of the original § Proposed —
// maintenance/ops agents item 2 (docs/plan.md), split out so its finding
// shows on both the Students and Classes pages (it's equally relevant to
// both) without also carrying the unrelated academic-year/gender findings
// that used to be bundled with it. Flags an active student with no
// class_students row in the current academic year — a gap promotion or
// manual enrollment edits can silently leave behind.
type UnclassedStudentJob struct {
	checks   *repositories.JobChecksRepository
	notifSvc *notifications.NotificationService
}

func NewUnclassedStudentJob(checks *repositories.JobChecksRepository, notifSvc *notifications.NotificationService) *UnclassedStudentJob {
	return &UnclassedStudentJob{checks: checks, notifSvc: notifSvc}
}

func (j *UnclassedStudentJob) Name() string     { return UnclassedStudentJobName }
func (j *UnclassedStudentJob) Schedule() string { return "30 3 * * *" } // daily 03:30
func (j *UnclassedStudentJob) Description() string {
	return "Flags active students with no class in the current academic year."
}

func (j *UnclassedStudentJob) Run(ctx context.Context) (Result, error) {
	students, err := j.checks.ListActiveStudentsWithoutCurrentClass(ctx)
	if err != nil {
		return Result{}, err
	}
	if len(students) == 0 {
		return Result{Summary: "every active student has a class in the current academic year", Findings: 0}, nil
	}

	names := make([]string, len(students))
	for i, s := range students {
		names[i] = fmt.Sprintf("%s (%s)", s.FullName, s.IndexNumber)
	}
	summary := fmt.Sprintf("%d active student(s) with no class in the current academic year: %s", len(students), strings.Join(names, ", "))

	if err := notifyAdmins(ctx, j.checks, j.notifSvc, "Students with no current-year class",
		summary, "general"); err != nil {
		return Result{Summary: summary, Findings: len(students)}, fmt.Errorf("found %d student(s) but failed to notify admins: %w", len(students), err)
	}
	return Result{Summary: summary, Findings: len(students)}, nil
}
