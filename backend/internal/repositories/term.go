package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type TermRepository struct {
	queries *db.Queries
}

func NewTermRepository(pool *pgxpool.Pool) *TermRepository {
	return &TermRepository{queries: db.New(pool)}
}

func (r *TermRepository) Create(ctx context.Context, params db.CreateTermParams) (db.Term, error) {
	return r.queries.CreateTerm(ctx, params)
}

func (r *TermRepository) GetByID(ctx context.Context, id uuid.UUID) (db.Term, error) {
	return r.queries.GetTermByID(ctx, id)
}

func (r *TermRepository) ListByAcademicYear(ctx context.Context, academicYearID uuid.UUID) ([]db.Term, error) {
	return r.queries.ListTermsByAcademicYear(ctx, academicYearID)
}

func (r *TermRepository) GetCurrent(ctx context.Context) (db.Term, error) {
	return r.queries.GetCurrentTerm(ctx)
}

func (r *TermRepository) SetCurrent(ctx context.Context, id uuid.UUID) error {
	return r.queries.SetCurrentTerm(ctx, id)
}

func (r *TermRepository) Update(ctx context.Context, params db.UpdateTermParams) (db.Term, error) {
	return r.queries.UpdateTerm(ctx, params)
}

func (r *TermRepository) Delete(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteTerm(ctx, id)
}
