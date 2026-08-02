package timetable

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type SubjectPeriodRequirementRepository struct {
	queries *db.Queries
}

func NewSubjectPeriodRequirementRepository(pool *pgxpool.Pool) *SubjectPeriodRequirementRepository {
	return &SubjectPeriodRequirementRepository{queries: db.New(pool)}
}

func (r *SubjectPeriodRequirementRepository) Upsert(ctx context.Context, params db.UpsertSubjectPeriodRequirementParams) (db.SubjectPeriodRequirement, error) {
	return r.queries.UpsertSubjectPeriodRequirement(ctx, params)
}

func (r *SubjectPeriodRequirementRepository) ListByGrade(ctx context.Context, academicYearID, gradeID uuid.UUID) ([]db.ListSubjectPeriodRequirementsByGradeRow, error) {
	return r.queries.ListSubjectPeriodRequirementsByGrade(ctx, db.ListSubjectPeriodRequirementsByGradeParams{
		AcademicYearID: academicYearID,
		GradeID:        gradeID,
	})
}

func (r *SubjectPeriodRequirementRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteSubjectPeriodRequirement(ctx, id)
}
