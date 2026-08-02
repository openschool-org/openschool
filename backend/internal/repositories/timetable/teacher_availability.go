package timetable

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type TeacherAvailabilityRepository struct {
	queries *db.Queries
}

func NewTeacherAvailabilityRepository(pool *pgxpool.Pool) *TeacherAvailabilityRepository {
	return &TeacherAvailabilityRepository{queries: db.New(pool)}
}

func (r *TeacherAvailabilityRepository) Create(ctx context.Context, params db.CreateTeacherAvailabilityParams) (db.TeacherAvailability, error) {
	return r.queries.CreateTeacherAvailability(ctx, params)
}

func (r *TeacherAvailabilityRepository) ListByTeacherYear(ctx context.Context, teacherID, academicYearID uuid.UUID) ([]db.TeacherAvailability, error) {
	return r.queries.ListTeacherAvailabilityByTeacherYear(ctx, db.ListTeacherAvailabilityByTeacherYearParams{
		TeacherID:      teacherID,
		AcademicYearID: academicYearID,
	})
}

func (r *TeacherAvailabilityRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteTeacherAvailability(ctx, id)
}

func (r *TeacherAvailabilityRepository) IsUnavailable(ctx context.Context, teacherID, academicYearID uuid.UUID, dayOfWeek, periodNumber int16) (bool, error) {
	return r.queries.IsTeacherUnavailable(ctx, db.IsTeacherUnavailableParams{
		TeacherID:      teacherID,
		AcademicYearID: academicYearID,
		DayOfWeek:      dayOfWeek,
		PeriodNumber:   periodNumber,
	})
}
