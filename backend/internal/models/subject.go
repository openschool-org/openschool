package models

// Type is a descriptive tag (core, elective, aesthetic, language, ...). It is
// free text: the useful set differs per school, and no logic branches on it.
type CreateSubjectRequest struct {
	Name     string   `json:"name" binding:"required"`
	Code     string   `json:"code" binding:"required"`
	Type     string   `json:"type"`
	MaxMarks *float64 `json:"max_marks"`
}

type UpdateSubjectRequest struct {
	Name     string   `json:"name" binding:"required"`
	Code     string   `json:"code" binding:"required"`
	Type     string   `json:"type"`
	MaxMarks *float64 `json:"max_marks"`
}

type SubjectResponse struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Code      string   `json:"code"`
	Type      *string  `json:"type"`
	MaxMarks  float64  `json:"max_marks"`
	CreatedAt string   `json:"created_at"`
}
