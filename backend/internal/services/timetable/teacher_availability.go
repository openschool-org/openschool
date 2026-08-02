package timetable

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	models "github.com/openschool-org/openschool/internal/models/timetable"
	repositories "github.com/openschool-org/openschool/internal/repositories/timetable"
)

type TeacherAvailabilityService struct {
	repo *repositories.TeacherAvailabilityRepository
}

func NewTeacherAvailabilityService(repo *repositories.TeacherAvailabilityRepository) *TeacherAvailabilityService {
	return &TeacherAvailabilityService{repo: repo}
}

func (s *TeacherAvailabilityService) Create(ctx context.Context, teacherID uuid.UUID, req models.CreateTeacherAvailabilityRequest) (db.TeacherAvailability, error) {
	if req.DayOfWeek < 1 || req.DayOfWeek > 5 {
		return db.TeacherAvailability{}, fmt.Errorf("day_of_week must be between 1 (Monday) and 5 (Friday)")
	}
	return s.repo.Create(ctx, db.CreateTeacherAvailabilityParams{
		TeacherID:      teacherID,
		AcademicYearID: req.AcademicYearID,
		DayOfWeek:      req.DayOfWeek,
		PeriodNumber:   req.PeriodNumber,
	})
}

func (s *TeacherAvailabilityService) ListByTeacherYear(ctx context.Context, teacherID, academicYearID uuid.UUID) ([]db.TeacherAvailability, error) {
	return s.repo.ListByTeacherYear(ctx, teacherID, academicYearID)
}

func (s *TeacherAvailabilityService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}
