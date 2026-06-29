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

type StreamResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
}

type StreamGroupResponse struct {
	ID        string `json:"id"`
	StreamID  string `json:"stream_id"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
}
