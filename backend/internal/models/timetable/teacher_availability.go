package timetable

import "github.com/google/uuid"

type CreateTeacherAvailabilityRequest struct {
	AcademicYearID uuid.UUID `json:"academic_year_id" binding:"required"`
	DayOfWeek      int16     `json:"day_of_week" binding:"required"`
	PeriodNumber   int16     `json:"period_number" binding:"required"`
}
