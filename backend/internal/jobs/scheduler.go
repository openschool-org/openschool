package jobs

import (
	"context"
	"fmt"
	"log"
	"sort"
	"sync"
	"time"

	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/robfig/cron/v3"
)

// runTimeout bounds a single job run so a stuck query can't wedge the
// scheduler forever — generous since these are meant to be occasional,
// read-mostly background checks, not latency-sensitive request handlers.
const runTimeout = 5 * time.Minute

// finishRunTimeout bounds the job_runs bookkeeping write specifically. It
// runs on context.Background() (deliberately decoupled from runCtx, which
// is already cancelled by the time this fires) rather than the caller's
// context, but still needs its own bound so a wedged DB can't leak a
// goroutine forever.
const finishRunTimeout = 10 * time.Second

// Scheduler owns the cron loop that ticks every registered Job on its own
// schedule. It is the only piece of this package that knows about
// job_settings/job_runs — individual jobs stay ignorant of scheduling,
// persistence, and each other.
type Scheduler struct {
	cron    *cron.Cron
	jobs    map[string]Job
	setting *repositories.JobSchedulerRepository
	// running guards each job against overlapping with itself — a
	// scheduled tick landing while an admin's "Run now" (or a previous
	// tick that's still going) is mid-flight for the *same* job. Built
	// once from the job list and never mutated afterward, so concurrent
	// reads of the map itself are safe without their own lock.
	running map[string]*sync.Mutex
}

// NewScheduler panics on a duplicate job Name() — two jobs sharing an
// identifier is a programming error (one would silently shadow the other
// in both the cron loop and the admin API), not a runtime condition to
// degrade gracefully from, so this fails loudly at startup instead.
func NewScheduler(jobList []Job, settingRepo *repositories.JobSchedulerRepository) *Scheduler {
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

// Jobs returns every registered job sorted by name, for the admin
// Automation panel's listing — deterministic regardless of Go's randomized
// map iteration order.
func (s *Scheduler) Jobs() []Job {
	out := make([]Job, 0, len(s.jobs))
	for _, j := range s.jobs {
		out = append(out, j)
	}
	sort.Slice(out, func(i, k int) bool { return out[i].Name() < out[k].Name() })
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

// execute is the single chokepoint both RunNow and runOne funnel through,
// which is what makes a per-job mutex here sufficient to prevent a job from
// overlapping with itself regardless of which path triggered each run (a
// scheduled tick landing mid-"Run now", two "Run now" clicks, etc.) — no
// separate coordination needed between the two callers. TryLock (rather
// than blocking) means a job that's still running when its next trigger
// fires is skipped, not queued.
func (s *Scheduler) execute(ctx context.Context, job Job) (Result, error) {
	lock := s.running[job.Name()]
	if !lock.TryLock() {
		return Result{}, fmt.Errorf("job %q is already running", job.Name())
	}
	defer lock.Unlock()

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
		// Deliberately not runCtx (already cancelled/expired by the time
		// job.Run returns) — but still its own bound rather than running
		// forever if the DB is wedged.
		finishCtx, finishCancel := context.WithTimeout(context.Background(), finishRunTimeout)
		defer finishCancel()
		if err := s.setting.FinishRun(finishCtx, run.ID, job.Name(), time.Now(), status, summary, int32(result.Findings)); err != nil {
			log.Printf("jobs: %s — failed to record run result: %v", job.Name(), err)
		}
	}

	return result, runErr
}

// runJobRecovering runs job.Run and converts a panic into a failed Result
// and error instead of letting it unwind past execute — a panicking job
// would otherwise skip FinishRun entirely (leaving its job_runs row stuck
// at "running" forever) and, when triggered via RunNow, crash the request
// goroutine handling the admin's "Run now" click.
func runJobRecovering(ctx context.Context, job Job) (result Result, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("job %q panicked: %v", job.Name(), r)
			result = Result{Summary: err.Error()}
		}
	}()
	return job.Run(ctx)
}
