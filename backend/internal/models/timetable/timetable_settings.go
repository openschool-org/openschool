package timetable

import "github.com/google/uuid"

type UpsertTimetableSettingsRequest struct {
	AcademicYearID          uuid.UUID `json:"academic_year_id" binding:"required"`
	SchoolStartTime         string    `json:"school_start_time" binding:"required"`
	SchoolEndTime           string    `json:"school_end_time" binding:"required"`
	NumberOfPeriods         int32     `json:"number_of_periods" binding:"required"`
	PeriodDurationMinutes   int32     `json:"period_duration_minutes" binding:"required"`
	IntervalDurationMinutes int32     `json:"interval_duration_minutes" binding:"required"`
}

type TimetableSettingsResponse struct {
	AcademicYearID          uuid.UUID `json:"academic_year_id"`
	SchoolStartTime         string    `json:"school_start_time"`
	SchoolEndTime           string    `json:"school_end_time"`
	NumberOfPeriods         int32     `json:"number_of_periods"`
	PeriodDurationMinutes   int32     `json:"period_duration_minutes"`
	IntervalDurationMinutes int32     `json:"interval_duration_minutes"`
}
