package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type TermMarkRepository struct {
	queries *db.Queries
}

func NewTermMarkRepository(pool *pgxpool.Pool) *TermMarkRepository {
	return &TermMarkRepository{queries: db.New(pool)}
}

func (r *TermMarkRepository) Upsert(ctx context.Context, params db.UpsertTermMarkParams) (db.TermMark, error) {
	return r.queries.UpsertTermMark(ctx, params)
}

func (r *TermMarkRepository) ListClassMarksForTermSubject(ctx context.Context, params db.ListClassMarksForTermSubjectParams) ([]db.ListClassMarksForTermSubjectRow, error) {
	return r.queries.ListClassMarksForTermSubject(ctx, params)
}

func (r *TermMarkRepository) ListStudentMarksByTerm(ctx context.Context, params db.ListStudentMarksByTermParams) ([]db.ListStudentMarksByTermRow, error) {
	return r.queries.ListStudentMarksByTerm(ctx, params)
}

func (r *TermMarkRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteTermMark(ctx, id)
}
