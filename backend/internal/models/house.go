package models

type CreateHouseRequest struct {
	Name      string `json:"name" binding:"required"`
	Code      string `json:"code"`
	Remainder int    `json:"remainder"`
}

type UpdateHouseRequest struct {
	Name      string `json:"name" binding:"required"`
	Code      string `json:"code"`
	Remainder int    `json:"remainder"`
}

type UpdateStudentHouseRequest struct {
	HouseID string `json:"house_id"`
}
