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

// GetGradeTIC returns the whole-grade TIC's teacher_profiles.id, or
// pgx.ErrNoRows if none is assigned.
func (r *SectionHeadRepository) GetGradeTIC(ctx context.Context, academicYearID, gradeID uuid.UUID) (uuid.UUID, error) {
	return r.queries.GetGradeTICForGrade(ctx, db.GetGradeTICForGradeParams{
		AcademicYearID: academicYearID,
		GradeID:        gradeID,
	})
}

// ListGradeIDsHeadedByTeacher returns the grades this teacher is the
// whole-grade TIC for, in the given academic year.
func (r *SectionHeadRepository) ListGradeIDsHeadedByTeacher(ctx context.Context, teacherID, academicYearID uuid.UUID) ([]uuid.UUID, error) {
	return r.queries.ListGradeIDsHeadedByTeacher(ctx, db.ListGradeIDsHeadedByTeacherParams{
		TeacherID:      teacherID,
		AcademicYearID: academicYearID,
	})
}
