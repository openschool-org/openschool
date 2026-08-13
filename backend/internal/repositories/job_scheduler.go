package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

// maxRunsPerJob bounds job_runs so a job that runs every few minutes forever
// doesn't grow the table without limit.
const maxRunsPerJob = 50

type JobSchedulerRepository struct {
	queries *db.Queries
}

func NewJobSchedulerRepository(pool *pgxpool.Pool) *JobSchedulerRepository {
	return &JobSchedulerRepository{queries: db.New(pool)}
}

// IsEnabled defaults to true when no row exists yet — a newly added job
// runs immediately without needing a seed migration; only an explicit
// disable writes a row.
func (r *JobSchedulerRepository) IsEnabled(ctx context.Context, jobName string) (bool, error) {
	setting, err := r.queries.GetJobSetting(ctx, jobName)
	if err == pgx.ErrNoRows {
		return true, nil
	}
	if err != nil {
		return false, err
	}
	return setting.Enabled, nil
}

func (r *JobSchedulerRepository) SetEnabled(ctx context.Context, jobName string, enabled bool) (db.JobSetting, error) {
	return r.queries.SetJobEnabled(ctx, db.SetJobEnabledParams{JobName: jobName, Enabled: enabled})
}

func (r *JobSchedulerRepository) ListSettings(ctx context.Context) ([]db.JobSetting, error) {
	return r.queries.ListJobSettings(ctx)
}

func (r *JobSchedulerRepository) StartRun(ctx context.Context, jobName string, startedAt time.Time) (db.JobRun, error) {
	return r.queries.CreateJobRun(ctx, db.CreateJobRunParams{
		JobName:   jobName,
		StartedAt: pgtype.Timestamptz{Time: startedAt, Valid: true},
	})
}

func (r *JobSchedulerRepository) FinishRun(ctx context.Context, runID uuid.UUID, jobName string, finishedAt time.Time, status, summary string, findings int32) error {
	if err := r.queries.FinishJobRun(ctx, db.FinishJobRunParams{
		ID:         runID,
		FinishedAt: pgtype.Timestamptz{Time: finishedAt, Valid: true},
		Status:     status,
		Summary:    pgtype.Text{String: summary, Valid: summary != ""},
		Findings:   findings,
	}); err != nil {
		return err
	}
	return r.queries.PruneJobRuns(ctx, db.PruneJobRunsParams{JobName: jobName, Limit: maxRunsPerJob})
}

func (r *JobSchedulerRepository) ListLatestRuns(ctx context.Context) ([]db.JobRun, error) {
	return r.queries.ListLatestJobRuns(ctx)
}

func (r *JobSchedulerRepository) ListRunHistory(ctx context.Context, jobName string, limit int32) ([]db.JobRun, error) {
	return r.queries.ListJobRunHistory(ctx, db.ListJobRunHistoryParams{JobName: jobName, Limit: limit})
}
