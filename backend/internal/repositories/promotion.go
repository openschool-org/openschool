package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type PromotionRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewPromotionRepository(pool *pgxpool.Pool) *PromotionRepository {
	return &PromotionRepository{pool: pool, queries: db.New(pool)}
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

// FindClassByGradeAndMedium returns pgx.ErrNoRows when the next grade has no
// class in the same medium — the student then falls back to a manual pick.
func (r *PromotionRepository) FindClassByGradeAndMedium(ctx context.Context, gradeID, academicYearID uuid.UUID, mediumID pgtype.UUID) (db.Class, error) {
	return r.queries.FindClassByGradeAndMedium(ctx, db.FindClassByGradeAndMediumParams{
		GradeID:        gradeID,
		AcademicYearID: academicYearID,
		MediumID:       mediumID,
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
// batched UNNEST write. Wrapped in a transaction so a crash or dropped
// connection between the delete and the insert can't leave every student in
// the batch with no class assignment at all — it's still safe to re-run
// (idempotent), but that no longer has to be the only thing standing between
// a mid-write interruption and a grade's worth of "unassigned" students.
func (r *PromotionRepository) CommitAssignments(ctx context.Context, academicYearID uuid.UUID, studentIDs, classIDs []uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	qtx := r.queries.WithTx(tx)

	if err := qtx.BulkDeleteClassStudentsForYear(ctx, db.BulkDeleteClassStudentsForYearParams{
		AcademicYearID: academicYearID,
		StudentIds:     studentIDs,
	}); err != nil {
		return err
	}

	if err := qtx.BulkInsertClassStudents(ctx, db.BulkInsertClassStudentsParams{
		ClassIds:   classIDs,
		StudentIds: studentIDs,
	}); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
