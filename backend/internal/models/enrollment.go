package models

// SubmitEnrollmentRequest replaces a student's picks for one level in one
// academic year. Picks are validated against every group of the level before
// anything is written.
type SubmitEnrollmentRequest struct {
	AcademicYearID string           `json:"academic_year_id" binding:"required"`
	LevelID        string           `json:"level_id" binding:"required"`
	Picks          []EnrollmentPick `json:"picks"`
}

type EnrollmentPick struct {
	GroupID   string `json:"group_id" binding:"required"`
	SubjectID string `json:"subject_id" binding:"required"`
	MediumID  string `json:"medium_id"`
}

// GroupValidationError reports one group whose pick count or membership is wrong.
type GroupValidationError struct {
	GroupID string `json:"group_id"`
	Label   string `json:"label"`
	Message string `json:"message"`
}

type EnrollmentValidationResponse struct {
	Valid  bool                   `json:"valid"`
	Errors []GroupValidationError `json:"errors"`
}

type EnrollmentResponse struct {
	StudentID      string  `json:"student_id"`
	AcademicYearID string  `json:"academic_year_id"`
	GroupID        string  `json:"group_id"`
	GroupLabel     string  `json:"group_label"`
	LevelID        string  `json:"level_id"`
	LevelLabel     string  `json:"level_label"`
	SubjectID      string  `json:"subject_id"`
	SubjectName    string  `json:"subject_name"`
	SubjectCode    string  `json:"subject_code"`
	SubjectType    *string `json:"subject_type"`
	MediumID       *string `json:"medium_id"`
	MediumName     *string `json:"medium_name"`
	EnrolledAt     string  `json:"enrolled_at"`
}

// EnrolledStudentResponse powers the "who takes this subject/group" reports.
type EnrolledStudentResponse struct {
	StudentID   string  `json:"student_id"`
	FullName    string  `json:"full_name"`
	IndexNumber string  `json:"index_number"`
	GroupID     *string `json:"group_id,omitempty"`
	GroupLabel  *string `json:"group_label,omitempty"`
	SubjectID   *string `json:"subject_id,omitempty"`
	SubjectName *string `json:"subject_name,omitempty"`
	SubjectCode *string `json:"subject_code,omitempty"`
	MediumID    *string `json:"medium_id"`
	MediumName  *string `json:"medium_name"`
	EnrolledAt  string  `json:"enrolled_at"`
}
