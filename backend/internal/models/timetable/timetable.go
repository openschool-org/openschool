package timetable

import "github.com/google/uuid"

type CreateTimetableRequest struct {
	AcademicYearID uuid.UUID `json:"academic_year_id" binding:"required"`
	ClassID        uuid.UUID `json:"class_id" binding:"required"`
}

type CopyFromTimetableRequest struct {
	SourceTimetableID uuid.UUID `json:"source_timetable_id" binding:"required"`
}

type TimetableEntryInput struct {
	DayOfWeek    int16      `json:"day_of_week" binding:"required"`
	PeriodNumber int16      `json:"period_number" binding:"required"`
	SubjectID    *uuid.UUID `json:"subject_id"`
	TeacherID    *uuid.UUID `json:"teacher_id"`
	ClassroomID  *uuid.UUID `json:"classroom_id"`
}

type SaveTimetableEntriesRequest struct {
	Entries []TimetableEntryInput `json:"entries" binding:"required"`
}

type RejectTimetableRequest struct {
	Comment string `json:"comment" binding:"required"`
}

type ApproveTimetableRequest struct {
	Comment string `json:"comment"`
}

// ValidationIssue is one problem found by the timetable validator. Severity
// "error" blocks submit/publish; "warning" is informational only.
type ValidationIssue struct {
	Severity     string `json:"severity"`
	Message      string `json:"message"`
	DayOfWeek    *int16 `json:"day_of_week,omitempty"`
	PeriodNumber *int16 `json:"period_number,omitempty"`
}

type ValidationResult struct {
	Valid  bool              `json:"valid"`
	Issues []ValidationIssue `json:"issues"`
}
