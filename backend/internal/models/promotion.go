package models

// PromotionPreviewRow is one student's current placement plus a
// non-binding suggestion for where they'd land in the target academic
// year — never written to the database until CommitAssignments is called.
type PromotionPreviewRow struct {
	StudentID          string   `json:"student_id"`
	StudentName        string   `json:"student_name"`
	StudentIndex       string   `json:"student_index"`
	CurrentClassID     string   `json:"current_class_id"`
	CurrentClassName   string   `json:"current_class_name"`
	CurrentGradeID     string   `json:"current_grade_id"`
	CurrentGradeName   string   `json:"current_grade_name"`
	NextGradeID        *string  `json:"next_grade_id"`
	NextGradeName      *string  `json:"next_grade_name"`
	Graduating         bool     `json:"graduating"`
	SuggestedClassID   *string  `json:"suggested_class_id"`
	SuggestedClassName *string  `json:"suggested_class_name"`
	TotalMarks         *float64 `json:"total_marks,omitempty"`
	TotalMaxMarks      *float64 `json:"total_max_marks,omitempty"`

	// MediumLocked marks a student whose current class is designated for a
	// language of instruction. Their suggestion is resolved by medium rather
	// than by class name, and the frontend keeps them out of the
	// distribute-by-marks / assign-randomly pools so a medium-designated
	// section is never partially refilled with students who don't belong.
	MediumLocked      bool    `json:"medium_locked"`
	CurrentMediumID   *string `json:"current_medium_id"`
	CurrentMediumName *string `json:"current_medium_name"`
}

// AssignmentEntry is one student's final target class, as decided by the
// admin (possibly overriding the preview's suggestion).
type AssignmentEntry struct {
	StudentID string `json:"student_id" binding:"required"`
	ClassID   string `json:"class_id" binding:"required"`
}

// CommitAssignmentsRequest bulk-writes class_students rows for an academic
// year — shared by both the promotion-commit step and general
// reassignment/shuffle, since both are "set these students' class for this
// year."
type CommitAssignmentsRequest struct {
	AcademicYearID string            `json:"academic_year_id" binding:"required"`
	Assignments    []AssignmentEntry `json:"assignments" binding:"required,min=1,dive"`
}
