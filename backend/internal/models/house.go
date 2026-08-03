package models

type CreateHouseRequest struct {
	Name  string `json:"name" binding:"required"`
	Code  string `json:"code"`
	Color string `json:"color" binding:"required"`
}

type UpdateHouseRequest struct {
	Name  string `json:"name" binding:"required"`
	Code  string `json:"code"`
	Color string `json:"color" binding:"required"`
}

type UpdateStudentHouseRequest struct {
	HouseID string `json:"house_id"`
}

type UpdateTeacherHouseRequest struct {
	HouseID string `json:"house_id"`
}
