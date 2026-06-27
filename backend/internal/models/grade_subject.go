package models

type AssignSubjectToGradeRequest struct {
	SubjectID string `json:"subject_id" binding:"required"`
}

type CreateSubjectBucketRequest struct {
	Name string `json:"name" binding:"required"`
}

type AddSubjectToBucketRequest struct {
	SubjectID string `json:"subject_id" binding:"required"`
}

type SubjectBucketResponse struct {
	ID        string `json:"id"`
	GradeID   string `json:"grade_id"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
}
