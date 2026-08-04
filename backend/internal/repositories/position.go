package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type PositionRepository struct {
	queries *db.Queries
}

func NewPositionRepository(pool *pgxpool.Pool) *PositionRepository {
	return &PositionRepository{queries: db.New(pool)}
}

func (r *PositionRepository) UpsertPrincipal(ctx context.Context, teacherID uuid.UUID) (db.TeacherPosition, error) {
	return r.queries.UpsertPrincipal(ctx, teacherID)
}

func (r *PositionRepository) UpsertVicePrincipal(ctx context.Context, params db.UpsertVicePrincipalParams) (db.TeacherPosition, error) {
	return r.queries.UpsertVicePrincipal(ctx, params)
}

func (r *PositionRepository) ReplaceVicePrincipalScopes(ctx context.Context, positionID uuid.UUID, gradeIDs []uuid.UUID) error {
	if err := r.queries.DeleteVicePrincipalScopes(ctx, positionID); err != nil {
		return err
	}
	for _, gradeID := range gradeIDs {
		if err := r.queries.InsertVicePrincipalScope(ctx, db.InsertVicePrincipalScopeParams{
			PositionID: positionID,
			GradeID:    gradeID,
		}); err != nil {
			return err
		}
	}
	return nil
}

func (r *PositionRepository) List(ctx context.Context) ([]db.ListTeacherPositionsRow, error) {
	return r.queries.ListTeacherPositions(ctx)
}

// GetForTeacher returns the position row a teacher holds (principal or
// vice_principal), or pgx.ErrNoRows if they hold none.
func (r *PositionRepository) GetForTeacher(ctx context.Context, teacherID uuid.UUID) (db.TeacherPosition, error) {
	return r.queries.GetTeacherPosition(ctx, teacherID)
}

func (r *PositionRepository) ListVicePrincipalScopeGrades(ctx context.Context, positionID uuid.UUID) ([]db.ListVicePrincipalScopeGradesRow, error) {
	return r.queries.ListVicePrincipalScopeGrades(ctx, positionID)
}

func (r *PositionRepository) Delete(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteTeacherPosition(ctx, id)
}

// DeleteByTeacherAndPosition removes a specific position held by a teacher —
// used when promoting a Vice Principal to Principal, to clear the old row.
func (r *PositionRepository) DeleteByTeacherAndPosition(ctx context.Context, teacherID uuid.UUID, position string) error {
	return r.queries.DeleteTeacherPositionByTeacherAndType(ctx, db.DeleteTeacherPositionByTeacherAndTypeParams{
		TeacherID: teacherID,
		Position:  position,
	})
}

// IsPrincipal reports whether the teacher is the (school's one, permanent)
// Principal.
func (r *PositionRepository) IsPrincipal(ctx context.Context, teacherID uuid.UUID) (bool, error) {
	return r.queries.IsPrincipal(ctx, teacherID)
}

// IsVicePrincipalAuthorizedForGrade reports whether the teacher is a Vice
// Principal whose grant (whole-school or grade scope) covers gradeID.
func (r *PositionRepository) IsVicePrincipalAuthorizedForGrade(ctx context.Context, teacherID, gradeID uuid.UUID) (bool, error) {
	return r.queries.IsVicePrincipalAuthorizedForGrade(ctx, db.IsVicePrincipalAuthorizedForGradeParams{
		TeacherID: teacherID,
		GradeID:   gradeID,
	})
}

// IsFormTeacherOfAnyClass reports whether the teacher is the form (class)
// teacher of at least one class in the given academic year. Unlike
// Principal/Vice Principal, this stays year-scoped — form-teacher
// assignment legitimately changes every year.
func (r *PositionRepository) IsFormTeacherOfAnyClass(ctx context.Context, teacherID, academicYearID uuid.UUID) (bool, error) {
	return r.queries.IsFormTeacherOfAnyClass(ctx, db.IsFormTeacherOfAnyClassParams{
		FormTeacherID:  pgtype.UUID{Bytes: teacherID, Valid: true},
		AcademicYearID: academicYearID,
	})
}

// IsSubjectTeacherOfAnyClass reports whether the teacher teaches at least
// one subject in at least one class in the given academic year.
func (r *PositionRepository) IsSubjectTeacherOfAnyClass(ctx context.Context, teacherID, academicYearID uuid.UUID) (bool, error) {
	return r.queries.IsSubjectTeacherOfAnyClass(ctx, db.IsSubjectTeacherOfAnyClassParams{
		TeacherID:      teacherID,
		AcademicYearID: academicYearID,
	})
}
