package timetable

type CreateClassroomRequest struct {
	Name     string `json:"name" binding:"required"`
	Code     string `json:"code"`
	Capacity *int32 `json:"capacity"`
}

type UpdateClassroomRequest struct {
	Name     string `json:"name" binding:"required"`
	Code     string `json:"code"`
	Capacity *int32 `json:"capacity"`
}
