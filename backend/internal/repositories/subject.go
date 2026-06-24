package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type SubjectRepository struct {
	queries *db.Queries
}

func NewSubjectRepository(pool *pgxpool.Pool) *SubjectRepository {
	return &SubjectRepository{queries: db.New(pool)}
}

func (r *SubjectRepository) Create(ctx context.Context, params db.CreateSubjectParams) (db.Subject, error) {
	return r.queries.CreateSubject(ctx, params)
}

func (r *SubjectRepository) GetByID(ctx context.Context, id uuid.UUID) (db.Subject, error) {
	return r.queries.GetSubjectByID(ctx, id)
}

func (r *SubjectRepository) GetByCode(ctx context.Context, code string) (db.Subject, error) {
	return r.queries.GetSubjectByCode(ctx, code)
}

func (r *SubjectRepository) List(ctx context.Context) ([]db.Subject, error) {
	return r.queries.ListSubjects(ctx)
}

func (r *SubjectRepository) Update(ctx context.Context, params db.UpdateSubjectParams) (db.Subject, error) {
	return r.queries.UpdateSubject(ctx, params)
}

func (r *SubjectRepository) Delete(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteSubject(ctx, id)
}
