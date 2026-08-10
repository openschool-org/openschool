package models

import "time"

var ValidNonAcademicDesignations = map[string]bool{
	"lab_assistant":       true,
	"librarian":           true,
	"office_staff":        true,
	"development_officer": true,
	"it_officer":          true,
	"security":            true,
	"minor_employee":      true,
}

type CreateNonAcademicStaffRequest struct {
	FullName    string    `json:"full_name" binding:"required"`
	Designation string    `json:"designation" binding:"required"`
	Phone       string    `json:"phone"`
	JoinedDate  time.Time `json:"joined_date" binding:"required"`
	Gender      string    `json:"gender" binding:"omitempty,oneof=male female"`
	HouseID     string    `json:"house_id"`
}

type UpdateNonAcademicStaffRequest struct {
	FullName    string `json:"full_name" binding:"required"`
	Designation string `json:"designation" binding:"required"`
	Phone       string `json:"phone"`
	Gender      string `json:"gender" binding:"omitempty,oneof=male female"`
}

type UpdateNonAcademicStaffEmploymentStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=active resigned transferred"`
}

type UpdateNonAcademicStaffHouseRequest struct {
	HouseID string `json:"house_id"`
}

type NonAcademicStaffResponse struct {
	ID               string `json:"id"`
	FullName         string `json:"full_name"`
	EmployeeNumber   string `json:"employee_number"`
	Designation      string `json:"designation"`
	Phone            string `json:"phone"`
	JoinedDate       string `json:"joined_date"`
	Gender           string `json:"gender"`
	HouseID          string `json:"house_id"`
	EmploymentStatus string `json:"employment_status"`
	CreatedAt        string `json:"created_at"`
}
