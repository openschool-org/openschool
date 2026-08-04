package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type PromotionRepository struct {
	queries *db.Queries
}

func NewPromotionRepository(pool *pgxpool.Pool) *PromotionRepository {
	return &PromotionRepository{queries: db.New(pool)}
}

// GetNextGrade returns the grade with the smallest sort_order greater than
// gradeID's; pgx.ErrNoRows means gradeID is the top grade (graduating).
func (r *PromotionRepository) GetNextGrade(ctx context.Context, gradeID uuid.UUID) (db.Grade, error) {
	return r.queries.GetNextGrade(ctx, gradeID)
}

func (r *PromotionRepository) ListActiveStudentsForYear(ctx context.Context, academicYearID uuid.UUID) ([]db.ListActiveStudentsForYearRow, error) {
	return r.queries.ListActiveStudentsForYear(ctx, academicYearID)
}

// FindClassByGradeAndName returns pgx.ErrNoRows when there's no same-name
// carryover suggestion.
func (r *PromotionRepository) FindClassByGradeAndName(ctx context.Context, gradeID, academicYearID uuid.UUID, name string) (db.Class, error) {
	return r.queries.FindClassByGradeAndName(ctx, db.FindClassByGradeAndNameParams{
		GradeID:        gradeID,
		AcademicYearID: academicYearID,
		Name:           name,
	})
}

func (r *PromotionRepository) ListStudentTotalMarksForTerm(ctx context.Context, termID uuid.UUID, studentIDs []uuid.UUID) ([]db.ListStudentTotalMarksForTermRow, error) {
	return r.queries.ListStudentTotalMarksForTerm(ctx, db.ListStudentTotalMarksForTermParams{
		TermID:     termID,
		StudentIds: studentIDs,
	})
}

// CountClassesInYear reports how many of classIDs actually belong to
// academicYearID — used to validate a commit request before writing.
func (r *PromotionRepository) CountClassesInYear(ctx context.Context, academicYearID uuid.UUID, classIDs []uuid.UUID) (int64, error) {
	return r.queries.CountClassesInYearByIDs(ctx, db.CountClassesInYearByIDsParams{
		AcademicYearID: academicYearID,
		ClassIds:       classIDs,
	})
}

// CommitAssignments clears any existing enrollment for these students in
// this academic year, then bulk-inserts the new class assignments in one
// batched UNNEST write. Not wrapped in a transaction (matches this
// codebase's existing non-transactional style elsewhere) — safe to re-run
// since it's idempotent.
func (r *PromotionRepository) CommitAssignments(ctx context.Context, academicYearID uuid.UUID, studentIDs, classIDs []uuid.UUID) error {
	if err := r.queries.BulkDeleteClassStudentsForYear(ctx, db.BulkDeleteClassStudentsForYearParams{
		AcademicYearID: academicYearID,
		StudentIds:     studentIDs,
	}); err != nil {
		return err
	}
	return r.queries.BulkInsertClassStudents(ctx, db.BulkInsertClassStudentsParams{
		ClassIds:   classIDs,
		StudentIds: studentIDs,
	})
}
