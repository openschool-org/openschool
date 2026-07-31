package models

type MarkEntry struct {
	StudentID string  `json:"student_id" binding:"required"`
	Marks     float64 `json:"marks"`
	MaxMarks  float64 `json:"max_marks"`
}

type BulkUpsertMarksRequest struct {
	TermID    string      `json:"term_id" binding:"required"`
	SubjectID string      `json:"subject_id" binding:"required"`
	Entries   []MarkEntry `json:"entries" binding:"required,min=1,dive"`
}
