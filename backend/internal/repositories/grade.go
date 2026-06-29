package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type GradeRepository struct {
	queries *db.Queries
}

func NewGradeRepository(pool *pgxpool.Pool) *GradeRepository {
	return &GradeRepository{queries: db.New(pool)}
}

func (r *GradeRepository) Create(ctx context.Context, params db.CreateGradeParams) (db.Grade, error) {
	return r.queries.CreateGrade(ctx, params)
}

func (r *GradeRepository) GetByID(ctx context.Context, id uuid.UUID) (db.Grade, error) {
	return r.queries.GetGradeByID(ctx, id)
}

func (r *GradeRepository) List(ctx context.Context) ([]db.Grade, error) {
	return r.queries.ListGrades(ctx)
}

func (r *GradeRepository) Update(ctx context.Context, params db.UpdateGradeParams) (db.Grade, error) {
	return r.queries.UpdateGrade(ctx, params)
}

func (r *GradeRepository) Delete(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteGrade(ctx, id)
}
