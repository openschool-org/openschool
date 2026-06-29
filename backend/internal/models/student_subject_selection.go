package models

type UpsertStudentSubjectSelectionRequest struct {
	BucketID  string `json:"bucket_id" binding:"required"`
	SubjectID string `json:"subject_id" binding:"required"`
}

type StudentSubjectSelectionResponse struct {
	BucketID    string `json:"bucket_id"`
	BucketName  string `json:"bucket_name"`
	SubjectID   string `json:"subject_id"`
	SubjectName string `json:"subject_name"`
	SubjectCode string `json:"subject_code"`
}
