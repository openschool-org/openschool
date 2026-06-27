package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type GradeSubjectRepository struct {
	queries *db.Queries
}

func NewGradeSubjectRepository(pool *pgxpool.Pool) *GradeSubjectRepository {
	return &GradeSubjectRepository{queries: db.New(pool)}
}

func (r *GradeSubjectRepository) AssignSubject(ctx context.Context, params db.AssignSubjectToGradeParams) error {
	return r.queries.AssignSubjectToGrade(ctx, params)
}

func (r *GradeSubjectRepository) RemoveSubject(ctx context.Context, params db.RemoveSubjectFromGradeParams) error {
	return r.queries.RemoveSubjectFromGrade(ctx, params)
}

func (r *GradeSubjectRepository) ListByGrade(ctx context.Context, gradeID uuid.UUID) ([]db.Subject, error) {
	return r.queries.ListSubjectsByGrade(ctx, gradeID)
}

func (r *GradeSubjectRepository) CreateBucket(ctx context.Context, params db.CreateSubjectBucketParams) (db.SubjectBucket, error) {
	return r.queries.CreateSubjectBucket(ctx, params)
}

func (r *GradeSubjectRepository) ListBucketsByGrade(ctx context.Context, gradeID uuid.UUID) ([]db.SubjectBucket, error) {
	return r.queries.ListSubjectBucketsByGrade(ctx, gradeID)
}

func (r *GradeSubjectRepository) AddSubjectToBucket(ctx context.Context, params db.AddSubjectToBucketParams) error {
	return r.queries.AddSubjectToBucket(ctx, params)
}

func (r *GradeSubjectRepository) ListBucketOptions(ctx context.Context, bucketID uuid.UUID) ([]db.Subject, error) {
	return r.queries.ListSubjectBucketOptions(ctx, bucketID)
}
