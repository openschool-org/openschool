package models

type CreateSubjectRequest struct {
	Name string `json:"name" binding:"required"`
	Code string `json:"code" binding:"required"`
}

type UpdateSubjectRequest struct {
	Name string `json:"name" binding:"required"`
	Code string `json:"code" binding:"required"`
}
