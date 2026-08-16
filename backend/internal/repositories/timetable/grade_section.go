package timetable

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type GradeSectionRepository struct {
	queries *db.Queries
}

func NewGradeSectionRepository(pool *pgxpool.Pool) *GradeSectionRepository {
	return &GradeSectionRepository{queries: db.New(pool)}
}

func (r *GradeSectionRepository) Create(ctx context.Context, params db.CreateGradeSectionParams) (db.GradeSection, error) {
	return r.queries.CreateGradeSection(ctx, params)
}

func (r *GradeSectionRepository) GetByID(ctx context.Context, id uuid.UUID) (db.GradeSection, error) {
	return r.queries.GetGradeSectionByID(ctx, id)
}

func (r *GradeSectionRepository) ListByYear(ctx context.Context, academicYearID uuid.UUID) ([]db.ListGradeSectionsByYearRow, error) {
	return r.queries.ListGradeSectionsByYear(ctx, academicYearID)
}

func (r *GradeSectionRepository) Update(ctx context.Context, params db.UpdateGradeSectionParams) (db.GradeSection, error) {
	return r.queries.UpdateGradeSection(ctx, params)
}

func (r *GradeSectionRepository) Delete(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteGradeSection(ctx, id)
}

func (r *GradeSectionRepository) AssignGrade(ctx context.Context, sectionID, gradeID, academicYearID uuid.UUID) error {
	return r.queries.AssignGradeToSection(ctx, db.AssignGradeToSectionParams{
		GradeSectionID: sectionID,
		GradeID:        gradeID,
		AcademicYearID: academicYearID,
	})
}

func (r *GradeSectionRepository) RemoveGrade(ctx context.Context, sectionID, gradeID uuid.UUID) error {
	return r.queries.RemoveGradeFromSection(ctx, db.RemoveGradeFromSectionParams{
		GradeSectionID: sectionID,
		GradeID:        gradeID,
	})
}

func (r *GradeSectionRepository) ListGrades(ctx context.Context, sectionID uuid.UUID) ([]db.Grade, error) {
	return r.queries.ListGradesBySection(ctx, sectionID)
}

func (r *GradeSectionRepository) GetForGrade(ctx context.Context, academicYearID, gradeID uuid.UUID) (db.GradeSection, error) {
	return r.queries.GetGradeSectionForGrade(ctx, db.GetGradeSectionForGradeParams{
		AcademicYearID: academicYearID,
		GradeID:        gradeID,
	})
}

// ListGradeIDsForSectionHeadTeacher returns every grade this teacher is authorized to review timetables for: either as the group-level grade_sections head, or as the per-grade section_heads TIC.
func (r *GradeSectionRepository) ListGradeIDsForSectionHeadTeacher(ctx context.Context, teacherID, academicYearID uuid.UUID) ([]uuid.UUID, error) {
	return r.queries.ListGradeIDsForSectionHeadTeacher(ctx, db.ListGradeIDsForSectionHeadTeacherParams{
		SectionHeadTeacherID: pgtype.UUID{Bytes: teacherID, Valid: true},
		AcademicYearID:       academicYearID,
	})
}

// Period grid

func (r *GradeSectionRepository) CreatePeriod(ctx context.Context, params db.CreateTimetablePeriodParams) (db.TimetablePeriod, error) {
	return r.queries.CreateTimetablePeriod(ctx, params)
}

func (r *GradeSectionRepository) ListPeriods(ctx context.Context, sectionID uuid.UUID) ([]db.TimetablePeriod, error) {
	return r.queries.ListTimetablePeriodsBySection(ctx, sectionID)
}

func (r *GradeSectionRepository) DeletePeriods(ctx context.Context, sectionID uuid.UUID) error {
	return r.queries.DeleteTimetablePeriodsBySection(ctx, sectionID)
}
