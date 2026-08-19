package timetable

import "github.com/google/uuid"

type GenerateTimetablesRequest struct {
	GradeSectionID uuid.UUID `json:"grade_section_id" binding:"required"`
	AcademicYearID uuid.UUID `json:"academic_year_id" binding:"required"`
}

// GenerationGap is one period-instance the generator couldn't place, and why.
type GenerationGap struct {
	SubjectName string `json:"subject_name"`
	TeacherName string `json:"teacher_name,omitempty"`
	Reason      string `json:"reason"`
}

type ClassGenerationResult struct {
	ClassID     uuid.UUID       `json:"class_id"`
	ClassName   string          `json:"class_name"`
	TimetableID *uuid.UUID      `json:"timetable_id,omitempty"`
	Placed      int             `json:"placed"`
	Required    int             `json:"required"`
	Gaps        []GenerationGap `json:"gaps"`
	// Skipped is true when the class already has a non-draft timetable this
	// year — it's left untouched rather than regenerated.
	Skipped    bool   `json:"skipped"`
	SkipReason string `json:"skip_reason,omitempty"`
}

type GenerationResult struct {
	Classes []ClassGenerationResult `json:"classes"`
}
