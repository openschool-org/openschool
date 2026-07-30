package models

// AssignSectionHeadRequest assigns a teacher-in-charge. StreamID is omitted
// (or empty) for a whole-grade TIC; set it to assign the TIC for one A/L
// stream within that grade instead.
type AssignSectionHeadRequest struct {
	AcademicYearID string  `json:"academic_year_id" binding:"required"`
	GradeID        string  `json:"grade_id" binding:"required"`
	StreamID       *string `json:"stream_id"`
	TeacherID      string  `json:"teacher_id" binding:"required"`
}
