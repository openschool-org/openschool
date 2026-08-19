package timetable

import "github.com/google/uuid"

type UpsertSubjectPeriodRequirementRequest struct {
	AcademicYearID uuid.UUID `json:"academic_year_id" binding:"required"`
	GradeID        uuid.UUID `json:"grade_id" binding:"required"`
	SubjectID      uuid.UUID `json:"subject_id" binding:"required"`
	PeriodsPerWeek int32     `json:"periods_per_week" binding:"required"`
	// how many of PeriodsPerWeek must be scheduled in a matching lab room;
	// 0 means the subject needs no lab time.
	LabPeriodsPerWeek int32 `json:"lab_periods_per_week"`
	// how many back-to-back 2-period blocks to carve out of PeriodsPerWeek
	// (e.g. AL subjects commonly run some periods as doubles) — not
	// all-or-nothing: a subject can have some double blocks and the rest as
	// regular singles. 0 means every period is scheduled singly.
	DoublePeriodBlocks int32 `json:"double_period_blocks"`
}
