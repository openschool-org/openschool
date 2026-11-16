package automation

import (
	"context"
	"fmt"
	"log"
	"sort"
	"sync"
	"time"

	"github.com/robfig/cron/v3"
)

// runTimeout bounds a single job run so a stuck query can't wedge the scheduler forever.
const runTimeout = 5 * time.Minute

// finishRunTimeout bounds the job_runs bookkeeping write, on its own context since runCtx has already ended by then.
const finishRunTimeout = 10 * time.Second

// Scheduler owns the cron loop that ticks every registered Job on its own schedule.
type Scheduler struct {
	cron    *cron.Cron
	jobs    map[string]Job
	setting *Repository
	// running guards each job against overlapping with itself across a scheduled tick and an admin's "Run now".
	running map[string]*sync.Mutex
}

// NewScheduler builds a Scheduler from jobList, panicking on a duplicate Job Name (a programming error, not a runtime one).
func NewScheduler(jobList []Job, settingRepo *Repository) *Scheduler {
	byName := make(map[string]Job, len(jobList))
	running := make(map[string]*sync.Mutex, len(jobList))
	for _, j := range jobList {
		name := j.Name()
		if _, exists := byName[name]; exists {
			panic(fmt.Sprintf("jobs: duplicate job name %q", name))
		}
		byName[name] = j
		running[name] = &sync.Mutex{}
	}
	return &Scheduler{
		cron:    cron.New(cron.WithChain(cron.Recover(cron.DefaultLogger))),
		jobs:    byName,
		setting: settingRepo,
		running: running,
	}
}

// Start schedules every registered job on its own cron expression and begins the cron loop in the background.
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

// Stop drains any in-flight run before returning.
func (s *Scheduler) Stop() {
	<-s.cron.Stop().Done()
}

// Jobs returns every registered job sorted by name, for a deterministic Automation panel listing.
func (s *Scheduler) Jobs() []Job {
	out := make([]Job, 0, len(s.jobs))
	for _, j := range s.jobs {
		out = append(out, j)
	}
	sort.Slice(out, func(i, k int) bool { return out[i].Name() < out[k].Name() })
	return out
}

// RunNow executes one job immediately regardless of its cron schedule, still honoring its enabled/disabled setting.
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

// runOne is what each cron tick calls: the same path as RunNow, but fire-and-forget and silent when disabled.
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

// execute is the shared chokepoint RunNow and runOne funnel through, which is what makes the per-job mutex sufficient.
func (s *Scheduler) execute(ctx context.Context, job Job) (Result, error) {
	lock := s.running[job.Name()]
	if !lock.TryLock() {
		return Result{}, fmt.Errorf("job %q is already running", job.Name())
	}
	defer lock.Unlock()

	// Across replicas: a second API instance skips a job the first is running.
	release, ok, err := s.setting.TryJobLock(ctx, job.Name())
	if err != nil {
		return Result{}, fmt.Errorf("job %q: could not take the run lock: %w", job.Name(), err)
	}
	defer release()
	if !ok {
		return Result{}, fmt.Errorf("job %q is already running on another server", job.Name())
	}

	runCtx, cancel := context.WithTimeout(ctx, runTimeout)
	defer cancel()

	started := time.Now()
	run, startErr := s.setting.StartRun(runCtx, job.Name(), started)
	if startErr != nil {
		log.Printf("jobs: %s — failed to record run start: %v", job.Name(), startErr)
	}

	result, runErr := runJobRecovering(runCtx, job)

	status := "ok"
	summary := result.Summary
	if runErr != nil {
		status = "failed"
		summary = runErr.Error()
	}

	if startErr == nil {
		// Its own timeout, not runCtx (already done by now) — so a wedged DB can't leak this goroutine forever.
		finishCtx, finishCancel := context.WithTimeout(context.Background(), finishRunTimeout)
		defer finishCancel()
		if err := s.setting.FinishRun(finishCtx, run.ID, job.Name(), time.Now(), status, summary, int32(result.Findings)); err != nil {
			log.Printf("jobs: %s — failed to record run result: %v", job.Name(), err)
		}
	}

	return result, runErr
}

// runJobRecovering runs job.Run and converts a panic into a failed Result instead of crashing the caller.
func runJobRecovering(ctx context.Context, job Job) (result Result, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("job %q panicked: %v", job.Name(), r)
			result = Result{Summary: err.Error()}
		}
	}()
	return job.Run(ctx)
}
