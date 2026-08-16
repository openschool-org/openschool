package jobs

import (
	"context"
	"fmt"
	"strings"

	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services/notifications"
)

const StaleAttendanceJobName = "stale_attendance_watcher"

// staleSessionAgeHours is how old an attendance session must be before an
// incomplete record count counts as "stale" rather than "still in
// progress" — long enough that a teacher plausibly finished their school
// day, short enough to still be actionable the same week.
const staleSessionAgeHours = 24

// StaleAttendanceJob is § Proposed — maintenance/ops agents item 6
// (docs/plan.md): the inverse gap from the operational nudge — a teacher
// can create a session and never call MarkAttendance, leaving it
// indistinguishable from "not started yet" except by a manual look.
type StaleAttendanceJob struct {
	checks   *repositories.JobChecksRepository
	notifSvc *notifications.NotificationService
}

func NewStaleAttendanceJob(checks *repositories.JobChecksRepository, notifSvc *notifications.NotificationService) *StaleAttendanceJob {
	return &StaleAttendanceJob{checks: checks, notifSvc: notifSvc}
}

func (j *StaleAttendanceJob) Name() string     { return StaleAttendanceJobName }
func (j *StaleAttendanceJob) Schedule() string { return "0 6 * * *" } // daily 06:00
func (j *StaleAttendanceJob) Description() string {
	return "Flags attendance sessions older than 24h with fewer records than the class roster — started but never finished."
}

func (j *StaleAttendanceJob) Run(ctx context.Context) (Result, error) {
	sessions, err := j.checks.ListStaleIncompleteSessions(ctx, staleSessionAgeHours)
	if err != nil {
		return Result{}, err
	}
	if len(sessions) == 0 {
		return Result{Summary: "no stale incomplete attendance sessions found", Findings: 0}, nil
	}

	descriptions := make([]string, len(sessions))
	for i, s := range sessions {
		descriptions[i] = fmt.Sprintf("%s on %s (%d/%d marked)", s.ClassName, s.Date.Time.Format("2006-01-02"), s.RecordCount, s.RosterSize)
	}
	summary := fmt.Sprintf("%d stale incomplete session(s): %s", len(sessions), strings.Join(descriptions, ", "))

	if err := notifyAdmins(ctx, j.checks, j.notifSvc, "Incomplete attendance sessions",
		summary, "attendance"); err != nil {
		return Result{Summary: summary, Findings: len(sessions)}, fmt.Errorf("found %d session(s) but failed to notify admins: %w", len(sessions), err)
	}
	return Result{Summary: summary, Findings: len(sessions)}, nil
}
