package jobs

import (
	"context"
	"fmt"
	"strings"

	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services/notifications"
)

const TermMarksDeadlineJobName = "term_marks_deadline_watcher"

// termDeadlineWindowDays is how close to a term's end_date this job starts
// flagging it as having zero marks entered.
const termDeadlineWindowDays = 7

// TermMarksDeadlineJob is the other half of the original § Proposed —
// maintenance/ops agents item 5 (docs/plan.md), split out so its finding
// shows only on the Class Marks page, not bundled with the unrelated
// missing-attendance-session finding. Flags terms nearing their lock date
// with zero marks entered anywhere.
type TermMarksDeadlineJob struct {
	checks   *repositories.JobChecksRepository
	notifSvc *notifications.NotificationService
}

func NewTermMarksDeadlineJob(checks *repositories.JobChecksRepository, notifSvc *notifications.NotificationService) *TermMarksDeadlineJob {
	return &TermMarksDeadlineJob{checks: checks, notifSvc: notifSvc}
}

func (j *TermMarksDeadlineJob) Name() string     { return TermMarksDeadlineJobName }
func (j *TermMarksDeadlineJob) Schedule() string { return "30 12 * * 1-5" } // weekdays at 12:30
func (j *TermMarksDeadlineJob) Description() string {
	return "Flags terms nearing their lock date (within 7 days) with zero marks entered anywhere."
}

func (j *TermMarksDeadlineJob) Run(ctx context.Context) (Result, error) {
	terms, err := j.checks.ListTermsNearDeadlineWithNoMarks(ctx, termDeadlineWindowDays)
	if err != nil {
		return Result{}, err
	}
	if len(terms) == 0 {
		return Result{Summary: "no terms near their deadline with zero marks entered", Findings: 0}, nil
	}

	names := make([]string, len(terms))
	for i, t := range terms {
		names[i] = fmt.Sprintf("%s (%s, ends %s)", t.Name, t.AcademicYearLabel, t.EndDate.Time.Format("2006-01-02"))
	}
	summary := fmt.Sprintf("%d term(s) near their deadline with zero marks entered: %s", len(terms), strings.Join(names, ", "))

	if err := notifyAdmins(ctx, j.checks, j.notifSvc, "Terms nearing deadline with no marks entered",
		summary, "academic"); err != nil {
		return Result{Summary: summary, Findings: len(terms)}, fmt.Errorf("found %d term(s) but failed to notify admins: %w", len(terms), err)
	}
	return Result{Summary: summary, Findings: len(terms)}, nil
}
