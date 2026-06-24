package models

type CreateStreamRequest struct {
	Name string `json:"name" binding:"required"`
}

type UpdateStreamRequest struct {
	Name string `json:"name" binding:"required"`
}

type CreateStreamGroupRequest struct {
	Name string `json:"name" binding:"required"`
}

type UpdateStreamGroupRequest struct {
	Name string `json:"name" binding:"required"`
}
