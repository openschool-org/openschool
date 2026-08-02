package timetable

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	models "github.com/openschool-org/openschool/internal/models/timetable"
	repositories "github.com/openschool-org/openschool/internal/repositories/timetable"
)

type TimetableSettingsService struct {
	repo *repositories.TimetableSettingsRepository
}

func NewTimetableSettingsService(repo *repositories.TimetableSettingsRepository) *TimetableSettingsService {
	return &TimetableSettingsService{repo: repo}
}

func toSettingsResponse(s db.TimetableSetting) models.TimetableSettingsResponse {
	return models.TimetableSettingsResponse{
		AcademicYearID:          s.AcademicYearID,
		SchoolStartTime:         formatClockTime(s.SchoolStartTime),
		SchoolEndTime:           formatClockTime(s.SchoolEndTime),
		NumberOfPeriods:         s.NumberOfPeriods,
		PeriodDurationMinutes:   s.PeriodDurationMinutes,
		IntervalDurationMinutes: s.IntervalDurationMinutes,
	}
}

func (s *TimetableSettingsService) Upsert(ctx context.Context, req models.UpsertTimetableSettingsRequest) (models.TimetableSettingsResponse, error) {
	start, err := parseClockTime(req.SchoolStartTime)
	if err != nil {
		return models.TimetableSettingsResponse{}, err
	}
	end, err := parseClockTime(req.SchoolEndTime)
	if err != nil {
		return models.TimetableSettingsResponse{}, err
	}
	if end.Microseconds <= start.Microseconds {
		return models.TimetableSettingsResponse{}, fmt.Errorf("school end time must be after start time")
	}
	if req.NumberOfPeriods <= 0 {
		return models.TimetableSettingsResponse{}, fmt.Errorf("number_of_periods must be positive")
	}

	settings, err := s.repo.Upsert(ctx, db.UpsertTimetableSettingsParams{
		AcademicYearID:          req.AcademicYearID,
		SchoolStartTime:         start,
		SchoolEndTime:           end,
		NumberOfPeriods:         req.NumberOfPeriods,
		PeriodDurationMinutes:   req.PeriodDurationMinutes,
		IntervalDurationMinutes: req.IntervalDurationMinutes,
	})
	if err != nil {
		return models.TimetableSettingsResponse{}, err
	}
	return toSettingsResponse(settings), nil
}

func (s *TimetableSettingsService) GetByYear(ctx context.Context, academicYearID uuid.UUID) (models.TimetableSettingsResponse, error) {
	settings, err := s.repo.GetByYear(ctx, academicYearID)
	if err != nil {
		return models.TimetableSettingsResponse{}, err
	}
	return toSettingsResponse(settings), nil
}
