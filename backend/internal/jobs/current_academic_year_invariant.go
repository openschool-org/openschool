package jobs

import (
	"context"
	"fmt"
	"strings"

	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services/notifications"
)

const CurrentAcademicYearInvariantJobName = "current_academic_year_invariant"

// CurrentAcademicYearInvariantJob is one third of the original § Proposed —
// maintenance/ops agents item 2 (docs/plan.md), split out so its finding
// only ever shows on the Academic Years page — not bundled with unrelated
// student/class findings. Nearly every table trusts "exactly one current
// year" (docs/adr/0003-single-current-academic-year.md), enforced at the
// app level only, not the DB.
type CurrentAcademicYearInvariantJob struct {
	checks   *repositories.JobChecksRepository
	notifSvc *notifications.NotificationService
}

func NewCurrentAcademicYearInvariantJob(checks *repositories.JobChecksRepository, notifSvc *notifications.NotificationService) *CurrentAcademicYearInvariantJob {
	return &CurrentAcademicYearInvariantJob{checks: checks, notifSvc: notifSvc}
}

func (j *CurrentAcademicYearInvariantJob) Name() string     { return CurrentAcademicYearInvariantJobName }
func (j *CurrentAcademicYearInvariantJob) Schedule() string { return "0 3 * * *" } // daily 03:00
func (j *CurrentAcademicYearInvariantJob) Description() string {
	return "Flags when the count of academic years marked current isn't exactly 1."
}

func (j *CurrentAcademicYearInvariantJob) Run(ctx context.Context) (Result, error) {
	years, err := j.checks.ListCurrentAcademicYears(ctx)
	if err != nil {
		return Result{}, err
	}
	if len(years) == 1 {
		return Result{Summary: fmt.Sprintf("exactly one current academic year (%s)", years[0].Label), Findings: 0}, nil
	}

	labels := make([]string, len(years))
	for i, y := range years {
		labels[i] = y.Label
	}
	var summary string
	if len(years) == 0 {
		summary = "no academic year is marked current"
	} else {
		summary = fmt.Sprintf("%d academic years marked current (expected exactly 1): %s", len(years), strings.Join(labels, ", "))
	}

	if err := notifyAdmins(ctx, j.checks, j.notifSvc, "Current-academic-year invariant violated",
		summary, "general"); err != nil {
		return Result{Summary: summary, Findings: 1}, fmt.Errorf("found an issue but failed to notify admins: %w", err)
	}
	return Result{Summary: summary, Findings: 1}, nil
}
