package jobs

import (
	"context"
	"fmt"
	"strings"

	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services/notifications"
)

const EmptyStreamJobName = "empty_stream_watcher"

// EmptyStreamJob is a new check (not in the original 10-item proposal),
// added for the Streams page — the same gap as EmptyGradeJob, for A/L
// streams: a stream defined but no Grade 12/13 class uses it this year.
type EmptyStreamJob struct {
	checks   *repositories.JobChecksRepository
	notifSvc *notifications.NotificationService
}

func NewEmptyStreamJob(checks *repositories.JobChecksRepository, notifSvc *notifications.NotificationService) *EmptyStreamJob {
	return &EmptyStreamJob{checks: checks, notifSvc: notifSvc}
}

func (j *EmptyStreamJob) Name() string     { return EmptyStreamJobName }
func (j *EmptyStreamJob) Schedule() string { return "15 4 * * 1" } // weekly, Monday 04:15
func (j *EmptyStreamJob) Description() string {
	return "Flags A/L streams with zero classes in the current academic year."
}

func (j *EmptyStreamJob) Run(ctx context.Context) (Result, error) {
	streams, err := j.checks.ListStreamsWithNoCurrentClasses(ctx)
	if err != nil {
		return Result{}, err
	}
	if len(streams) == 0 {
		return Result{Summary: "every stream has at least one class this year", Findings: 0}, nil
	}

	names := make([]string, len(streams))
	for i, s := range streams {
		names[i] = s.Name
	}
	summary := fmt.Sprintf("%d stream(s) with no classes this year: %s", len(streams), strings.Join(names, ", "))

	if err := notifyAdmins(ctx, j.checks, j.notifSvc, "Streams with no current-year classes",
		summary, "general"); err != nil {
		return Result{Summary: summary, Findings: len(streams)}, fmt.Errorf("found %d stream(s) but failed to notify admins: %w", len(streams), err)
	}
	return Result{Summary: summary, Findings: len(streams)}, nil
}
