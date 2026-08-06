package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type PrefectRepository struct {
	queries *db.Queries
}

func NewPrefectRepository(pool *pgxpool.Pool) *PrefectRepository {
	return &PrefectRepository{queries: db.New(pool)}
}

func (r *PrefectRepository) Upsert(ctx context.Context, params db.UpsertPrefectParams) (db.Prefect, error) {
	return r.queries.UpsertPrefect(ctx, params)
}

func (r *PrefectRepository) ListByYear(ctx context.Context, academicYearID uuid.UUID) ([]db.ListPrefectsByYearRow, error) {
	return r.queries.ListPrefectsByYear(ctx, academicYearID)
}

func (r *PrefectRepository) Delete(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeletePrefect(ctx, id)
}

func (r *PrefectRepository) ListByStudent(ctx context.Context, studentID uuid.UUID) ([]db.ListPrefectAppointmentsByStudentRow, error) {
	return r.queries.ListPrefectAppointmentsByStudent(ctx, studentID)
}

func (r *PrefectRepository) ListYears(ctx context.Context) ([]db.ListPrefectYearsRow, error) {
	return r.queries.ListPrefectYears(ctx)
}
