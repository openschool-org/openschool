package jobs

import (
	"context"
	"fmt"
	"strings"

	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services/notifications"
)

const GenderSchoolTypeJobName = "student_gender_school_type_watcher"

// GenderSchoolTypeJob is one third of the original § Proposed —
// maintenance/ops agents item 2 (docs/plan.md), split out so its finding
// shows only on the Students page. Catches a single-sex school's roster
// drifting out of sync with school.school_type (Phase 11 item 1) — e.g.
// the type was flipped after students of the other gender were already
// enrolled.
type GenderSchoolTypeJob struct {
	checks   *repositories.JobChecksRepository
	notifSvc *notifications.NotificationService
}

func NewGenderSchoolTypeJob(checks *repositories.JobChecksRepository, notifSvc *notifications.NotificationService) *GenderSchoolTypeJob {
	return &GenderSchoolTypeJob{checks: checks, notifSvc: notifSvc}
}

func (j *GenderSchoolTypeJob) Name() string     { return GenderSchoolTypeJobName }
func (j *GenderSchoolTypeJob) Schedule() string { return "15 3 * * *" } // daily 03:15
func (j *GenderSchoolTypeJob) Description() string {
	return "Flags active students whose gender doesn't match the school's single-sex type."
}

func (j *GenderSchoolTypeJob) Run(ctx context.Context) (Result, error) {
	students, err := j.checks.ListGenderSchoolTypeMismatches(ctx)
	if err != nil {
		return Result{}, err
	}
	if len(students) == 0 {
		return Result{Summary: "no student gender / school-type mismatches found", Findings: 0}, nil
	}

	names := make([]string, len(students))
	for i, s := range students {
		names[i] = fmt.Sprintf("%s (%s)", s.FullName, s.IndexNumber)
	}
	summary := fmt.Sprintf("%d student(s) with gender inconsistent with the school's single-sex type: %s", len(students), strings.Join(names, ", "))

	if err := notifyAdmins(ctx, j.checks, j.notifSvc, "Student gender / school-type mismatches",
		summary, "general"); err != nil {
		return Result{Summary: summary, Findings: len(students)}, fmt.Errorf("found %d issue(s) but failed to notify admins: %w", len(students), err)
	}
	return Result{Summary: summary, Findings: len(students)}, nil
}
