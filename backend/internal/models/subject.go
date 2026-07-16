package models

// Type is a descriptive tag (core, elective, aesthetic, language, ...). It is
// free text: the useful set differs per school, and no logic branches on it.
type CreateSubjectRequest struct {
	Name string `json:"name" binding:"required"`
	Code string `json:"code" binding:"required"`
	Type string `json:"type"`
}

type UpdateSubjectRequest struct {
	Name string `json:"name" binding:"required"`
	Code string `json:"code" binding:"required"`
	Type string `json:"type"`
}

type SubjectResponse struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Code      string  `json:"code"`
	Type      *string `json:"type"`
	CreatedAt string  `json:"created_at"`
}
