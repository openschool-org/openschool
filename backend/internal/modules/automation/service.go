package automation

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
)

var (
	ErrUnknownJob             = errors.New("unknown job")
	ErrSystemHealthCannotStop = errors.New("the system-health (backup) agent cannot be disabled")
)

// Service coordinates the scheduler's registered jobs with their persisted settings and history.
type Service struct {
	scheduler *Scheduler
	settings  *Repository
}

func NewService(scheduler *Scheduler, settings *Repository) *Service {
	return &Service{scheduler: scheduler, settings: settings}
}

func (s *Service) List(ctx context.Context) ([]JobStatus, error) {
	settingsRows, err := s.settings.ListSettings(ctx)
	if err != nil {
		return nil, err
	}
	enabledByName := make(map[string]bool, len(settingsRows))
	for _, setting := range settingsRows {
		enabledByName[setting.JobName] = setting.Enabled
	}

	runRows, err := s.settings.ListLatestRuns(ctx)
	if err != nil {
		return nil, err
	}
	lastRunByName := make(map[string]JobLastRun, len(runRows))
	for _, run := range runRows {
		lastRun := JobLastRun{Status: run.Status, Summary: run.Summary, Findings: run.Findings, StartedAt: run.StartedAt, FinishedAt: run.FinishedAt}
		lastRunByName[run.JobName] = lastRun
	}

	out := make([]JobStatus, 0, len(s.scheduler.Jobs()))
	for _, job := range s.scheduler.Jobs() {
		enabled, ok := enabledByName[job.Name()]
		if !ok {
			enabled = true
		}
		status := JobStatus{Name: job.Name(), Title: job.Name(), Description: job.Description(), Schedule: job.Schedule(), ScheduleLabel: scheduleLabel(job.Schedule()), Enabled: enabled, CanDisable: true}
		if d, ok := job.(Describer); ok {
			status.Title, status.CanDisable, status.Checks = d.Title(), d.CanDisable(), d.Checks()
		}
		if lastRun, ok := lastRunByName[job.Name()]; ok {
			status.LastRun = &lastRun
		}
		out = append(out, status)
	}
	return out, nil
}

func (s *Service) SetEnabled(ctx context.Context, name string, enabled bool) error {
	if !s.isKnown(name) {
		return ErrUnknownJob
	}
	if d, ok := s.scheduler.jobs[name].(Describer); ok && !enabled && !d.CanDisable() {
		return ErrSystemHealthCannotStop
	}
	return s.settings.SetEnabled(ctx, name, enabled)
}

func (s *Service) RunNow(ctx context.Context, name string) (Result, error) {
	if !s.isKnown(name) {
		return Result{}, ErrUnknownJob
	}
	return s.scheduler.RunNow(ctx, name)
}

func (s *Service) isKnown(name string) bool {
	for _, job := range s.scheduler.Jobs() {
		if job.Name() == name {
			return true
		}
	}
	return false
}

// pageMatches is a prefix match so /classes also covers /classes/123.
func pageMatches(pages []string, path string) bool {
	for _, p := range pages {
		if path == p || strings.HasPrefix(path, p+"/") {
			return true
		}
	}
	return false
}

// Findings returns this admin's latest unread agent notice for every check shown on the page.
func (s *Service) Findings(ctx context.Context, userID uuid.UUID, page string) ([]Finding, error) {
	type origin struct{ agent, check string }
	byTitle := map[string]origin{}
	for _, job := range s.scheduler.Jobs() {
		d, ok := job.(Describer)
		if !ok {
			continue
		}
		for _, c := range d.Checks() {
			if c.FindingTitle != "" && pageMatches(c.Pages, page) {
				byTitle[c.FindingTitle] = origin{agent: d.Title(), check: c.Title}
			}
		}
	}
	if len(byTitle) == 0 {
		return []Finding{}, nil
	}
	titles := make([]string, 0, len(byTitle))
	for t := range byTitle {
		titles = append(titles, t)
	}
	rows, err := s.settings.ListUnreadFindingsByTitle(ctx, userID, titles)
	if err != nil {
		return nil, err
	}
	out := make([]Finding, len(rows))
	for i, r := range rows {
		o := byTitle[r.Title]
		out[i] = Finding{NotificationID: r.NotificationID.String(), Agent: o.agent, Check: o.check, Title: r.Title, Message: r.Message, SentAt: r.SentAt.Time.Format("2006-01-02T15:04:05Z07:00")}
	}
	return out, nil
}
