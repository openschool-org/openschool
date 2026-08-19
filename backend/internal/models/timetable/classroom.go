package timetable

import "github.com/google/uuid"

// RoomType is "regular" (a class's fixed homeroom), "lab" (subject-tagged,
// e.g. Science Lab), or "eca" (Extra-Curricular Activities).
type CreateClassroomRequest struct {
	Name     string `json:"name" binding:"required"`
	Code     string `json:"code"`
	Capacity *int32 `json:"capacity"`
	RoomType string `json:"room_type" binding:"required,oneof=regular lab eca"`
	// required when RoomType is "lab" — which subject this lab is for.
	SubjectID *uuid.UUID `json:"subject_id"`
}

type UpdateClassroomRequest struct {
	Name      string     `json:"name" binding:"required"`
	Code      string     `json:"code"`
	Capacity  *int32     `json:"capacity"`
	RoomType  string     `json:"room_type" binding:"required,oneof=regular lab eca"`
	SubjectID *uuid.UUID `json:"subject_id"`
}
