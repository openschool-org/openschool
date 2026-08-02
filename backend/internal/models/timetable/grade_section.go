package timetable

import "github.com/google/uuid"

type CreateGradeSectionRequest struct {
	AcademicYearID       uuid.UUID   `json:"academic_year_id" binding:"required"`
	Name                 string      `json:"name" binding:"required"`
	IntervalStartTime    string      `json:"interval_start_time" binding:"required"`
	IntervalEndTime      string      `json:"interval_end_time" binding:"required"`
	SectionHeadTeacherID *uuid.UUID  `json:"section_head_teacher_id"`
	SortOrder            int32       `json:"sort_order"`
	GradeIDs             []uuid.UUID `json:"grade_ids"`
}

type UpdateGradeSectionRequest struct {
	Name                 string     `json:"name" binding:"required"`
	IntervalStartTime    string     `json:"interval_start_time" binding:"required"`
	IntervalEndTime      string     `json:"interval_end_time" binding:"required"`
	SectionHeadTeacherID *uuid.UUID `json:"section_head_teacher_id"`
	SortOrder            int32      `json:"sort_order"`
}

type AssignGradesToSectionRequest struct {
	GradeIDs []uuid.UUID `json:"grade_ids" binding:"required"`
}

type GradeSectionResponse struct {
	ID                   uuid.UUID   `json:"id"`
	AcademicYearID       uuid.UUID   `json:"academic_year_id"`
	Name                 string      `json:"name"`
	IntervalStartTime    string      `json:"interval_start_time"`
	IntervalEndTime      string      `json:"interval_end_time"`
	SectionHeadTeacherID *uuid.UUID  `json:"section_head_teacher_id,omitempty"`
	SectionHeadName      *string     `json:"section_head_name,omitempty"`
	SortOrder            int32       `json:"sort_order"`
	GradeIDs             []uuid.UUID `json:"grade_ids"`
}

// TimetablePeriodEntry describes one row of a grade_section's period grid.
// PeriodNumber is nil for the interval row.
type TimetablePeriodEntry struct {
	PeriodNumber *int32 `json:"period_number"`
	StartTime    string `json:"start_time" binding:"required"`
	EndTime      string `json:"end_time" binding:"required"`
	SlotType     string `json:"slot_type" binding:"required"`
}

type SaveTimetablePeriodsRequest struct {
	Periods []TimetablePeriodEntry `json:"periods" binding:"required"`
}

type TimetablePeriodResponse struct {
	ID           uuid.UUID `json:"id"`
	SortOrder    int32     `json:"sort_order"`
	PeriodNumber *int32    `json:"period_number"`
	StartTime    string    `json:"start_time"`
	EndTime      string    `json:"end_time"`
	SlotType     string    `json:"slot_type"`
}
