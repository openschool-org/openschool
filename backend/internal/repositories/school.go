package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type SchoolRepository struct {
	queries *db.Queries
}

func NewSchoolRepository(pool *pgxpool.Pool) *SchoolRepository {
	return &SchoolRepository{queries: db.New(pool)}
}

func (r *SchoolRepository) Create(ctx context.Context, params db.CreateSchoolParams) (db.School, error) {
	return r.queries.CreateSchool(ctx, params)
}

func (r *SchoolRepository) Get(ctx context.Context) (db.School, error) {
	return r.queries.GetSchool(ctx)
}

func (r *SchoolRepository) Update(ctx context.Context, params db.UpdateSchoolParams) (db.School, error) {
	return r.queries.UpdateSchool(ctx, params)
}

func (r *SchoolRepository) CreateAcademicYear(ctx context.Context, params db.CreateAcademicYearParams) (db.AcademicYear, error) {
	return r.queries.CreateAcademicYear(ctx, params)
}

func (r *SchoolRepository) GetCurrentAcademicYear(ctx context.Context) (db.AcademicYear, error) {
	return r.queries.GetCurrentAcademicYear(ctx)
}

func (r *SchoolRepository) ListAcademicYears(ctx context.Context) ([]db.AcademicYear, error) {
	return r.queries.ListAcademicYears(ctx)
}

func (r *SchoolRepository) SetCurrentAcademicYear(ctx context.Context, id uuid.UUID) error {
	return r.queries.SetCurrentAcademicYear(ctx, id)
}

func (r *SchoolRepository) DeleteAcademicYear(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteAcademicYear(ctx, id)
}
