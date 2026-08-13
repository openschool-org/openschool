package jobs

import (
	"context"
	"fmt"
	"strings"

	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services/notifications"
)

const MissingAttendanceSessionJobName = "missing_attendance_session_watcher"

// MissingAttendanceSessionJob is half of the original § Proposed —
// maintenance/ops agents item 5 (docs/plan.md), split out so its finding
// shows only on the Attendance page, not bundled with the unrelated
// term-marks-deadline finding. Flags classes with no attendance session
// created yet today. Phase 11 item 3 describes escalating this to
// individual teachers up the position hierarchy — that resolver doesn't
// exist yet, so this stays an admin-facing digest.
type MissingAttendanceSessionJob struct {
	checks   *repositories.JobChecksRepository
	notifSvc *notifications.NotificationService
}

func NewMissingAttendanceSessionJob(checks *repositories.JobChecksRepository, notifSvc *notifications.NotificationService) *MissingAttendanceSessionJob {
	return &MissingAttendanceSessionJob{checks: checks, notifSvc: notifSvc}
}

func (j *MissingAttendanceSessionJob) Name() string     { return MissingAttendanceSessionJobName }
func (j *MissingAttendanceSessionJob) Schedule() string { return "0 12 * * 1-5" } // weekdays at noon
func (j *MissingAttendanceSessionJob) Description() string {
	return "Flags classes with no attendance session taken yet today."
}

func (j *MissingAttendanceSessionJob) Run(ctx context.Context) (Result, error) {
	classes, err := j.checks.ListCurrentYearClassesMissingTodaySession(ctx)
	if err != nil {
		return Result{}, err
	}
	if len(classes) == 0 {
		return Result{Summary: "every class has an attendance session today", Findings: 0}, nil
	}

	names := make([]string, len(classes))
	for i, c := range classes {
		names[i] = fmt.Sprintf("%s %s", c.GradeName, c.Name)
	}
	summary := fmt.Sprintf("%d class(es) with no attendance session today: %s", len(classes), strings.Join(names, ", "))

	if err := notifyAdmins(ctx, j.checks, j.notifSvc, "Classes missing today's attendance session",
		summary, "attendance"); err != nil {
		return Result{Summary: summary, Findings: len(classes)}, fmt.Errorf("found %d class(es) but failed to notify admins: %w", len(classes), err)
	}
	return Result{Summary: summary, Findings: len(classes)}, nil
}
