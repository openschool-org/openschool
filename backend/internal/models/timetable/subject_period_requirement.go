package timetable

import "github.com/google/uuid"

type UpsertSubjectPeriodRequirementRequest struct {
	AcademicYearID uuid.UUID `json:"academic_year_id" binding:"required"`
	GradeID        uuid.UUID `json:"grade_id" binding:"required"`
	SubjectID      uuid.UUID `json:"subject_id" binding:"required"`
	PeriodsPerWeek int32     `json:"periods_per_week" binding:"required"`
}
