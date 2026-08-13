package jobs

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/robfig/cron/v3"
)

// runTimeout bounds a single job run so a stuck query can't wedge the
// scheduler forever — generous since these are meant to be occasional,
// read-mostly background checks, not latency-sensitive request handlers.
const runTimeout = 5 * time.Minute

// Scheduler owns the cron loop that ticks every registered Job on its own
// schedule. It is the only piece of this package that knows about
// job_settings/job_runs — individual jobs stay ignorant of scheduling,
// persistence, and each other.
type Scheduler struct {
	cron    *cron.Cron
	jobs    map[string]Job
	setting *repositories.JobSchedulerRepository
}

func NewScheduler(jobList []Job, settingRepo *repositories.JobSchedulerRepository) *Scheduler {
	byName := make(map[string]Job, len(jobList))
	for _, j := range jobList {
		byName[j.Name()] = j
	}
	return &Scheduler{
		cron:    cron.New(),
		jobs:    byName,
		setting: settingRepo,
	}
}

// Start schedules every registered job on its own cron expression and
// begins running the cron loop in the background. A job whose expression
// fails to parse is logged and skipped rather than aborting startup — one
// malformed schedule shouldn't take every other job down with it.
func (s *Scheduler) Start() {
	for _, job := range s.jobs {
		j := job // capture for the closure
		if _, err := s.cron.AddFunc(j.Schedule(), func() {
			s.runOne(context.Background(), j)
		}); err != nil {
			log.Printf("jobs: skipping %s — invalid schedule %q: %v", j.Name(), j.Schedule(), err)
		}
	}
	s.cron.Start()
}

// Stop drains any in-flight run before returning, so a shutdown mid-run
// doesn't leave a job_runs row stuck in "running" forever.
func (s *Scheduler) Stop() {
	<-s.cron.Stop().Done()
}

// Jobs returns every registered job in a stable order, for the admin
// Automation panel's listing.
func (s *Scheduler) Jobs() []Job {
	out := make([]Job, 0, len(s.jobs))
	for _, j := range s.jobs {
		out = append(out, j)
	}
	return out
}

// RunNow executes one job immediately regardless of its cron schedule (but
// still honoring its enabled/disabled setting) — the admin panel's "Run
// now" action.
func (s *Scheduler) RunNow(ctx context.Context, name string) (Result, error) {
	job, ok := s.jobs[name]
	if !ok {
		return Result{}, fmt.Errorf("unknown job %q", name)
	}
	enabled, err := s.setting.IsEnabled(ctx, name)
	if err != nil {
		return Result{}, err
	}
	if !enabled {
		return Result{}, fmt.Errorf("job %q is disabled", name)
	}
	return s.execute(ctx, job)
}

// runOne is what each cron tick calls — same execution path as RunNow, but
// fire-and-forget (errors are logged, not returned to a caller) and skips
// disabled jobs silently instead of erroring.
func (s *Scheduler) runOne(ctx context.Context, job Job) {
	enabled, err := s.setting.IsEnabled(ctx, job.Name())
	if err != nil {
		log.Printf("jobs: %s — failed to check enabled state: %v", job.Name(), err)
		return
	}
	if !enabled {
		return
	}
	if _, err := s.execute(ctx, job); err != nil {
		log.Printf("jobs: %s failed: %v", job.Name(), err)
	}
}

func (s *Scheduler) execute(ctx context.Context, job Job) (Result, error) {
	runCtx, cancel := context.WithTimeout(ctx, runTimeout)
	defer cancel()

	started := time.Now()
	run, startErr := s.setting.StartRun(runCtx, job.Name(), started)

	result, runErr := job.Run(runCtx)

	status := "ok"
	summary := result.Summary
	if runErr != nil {
		status = "failed"
		summary = runErr.Error()
	}

	if startErr == nil {
		if err := s.setting.FinishRun(context.Background(), run.ID, job.Name(), time.Now(), status, summary, int32(result.Findings)); err != nil {
			log.Printf("jobs: %s — failed to record run result: %v", job.Name(), err)
		}
	}

	return result, runErr
}
