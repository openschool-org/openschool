package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type SectionHeadRepository struct {
	queries *db.Queries
}

func NewSectionHeadRepository(pool *pgxpool.Pool) *SectionHeadRepository {
	return &SectionHeadRepository{queries: db.New(pool)}
}

func (r *SectionHeadRepository) UpsertGrade(ctx context.Context, params db.UpsertGradeSectionHeadParams) (db.SectionHead, error) {
	return r.queries.UpsertGradeSectionHead(ctx, params)
}

func (r *SectionHeadRepository) UpsertStream(ctx context.Context, params db.UpsertStreamSectionHeadParams) (db.SectionHead, error) {
	return r.queries.UpsertStreamSectionHead(ctx, params)
}

func (r *SectionHeadRepository) ListByYear(ctx context.Context, academicYearID uuid.UUID) ([]db.ListSectionHeadsByYearRow, error) {
	return r.queries.ListSectionHeadsByYear(ctx, academicYearID)
}

func (r *SectionHeadRepository) Delete(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteSectionHead(ctx, id)
}
