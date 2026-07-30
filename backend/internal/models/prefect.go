package models

// AssignPrefectRequest appoints (or re-appoints, changing rank) a student as
// a prefect for an academic year. Rank must be one of: junior, senior,
// deputy_head, head.
type AssignPrefectRequest struct {
	AcademicYearID string `json:"academic_year_id" binding:"required"`
	StudentID      string `json:"student_id" binding:"required"`
	Rank           string `json:"rank" binding:"required,oneof=junior senior deputy_head head"`
}
