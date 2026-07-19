package models

import "time"

type CreateTeacherRequest struct {
	// Asgardeo account fields
	Email       string `json:"email" binding:"required,email"`
	GivenName   string `json:"given_name" binding:"required"`
	FamilyName  string `json:"family_name" binding:"required"`
	PhoneNumber string `json:"phone_number"`
	Password    string `json:"password" binding:"required,min=8"`

	// Teacher profile fields
	EmployeeNumber string    `json:"employee_number" binding:"required"`
	JoinedDate     time.Time `json:"joined_date" binding:"required"`
}

type UpdateTeacherRequest struct {
	GivenName      string `json:"given_name" binding:"required"`
	FamilyName     string `json:"family_name" binding:"required"`
	PhoneNumber    string `json:"phone_number"`
	EmployeeNumber string `json:"employee_number" binding:"required"`
}

type AssignSubjectToTeacherRequest struct {
	SubjectID string `json:"subject_id" binding:"required"`
}

type TeacherResponse struct {
	ID             string `json:"id"`
	UserID         string `json:"user_id"`
	FullName       string `json:"full_name"`
	EmployeeNumber string `json:"employee_number"`
	JoinedDate     string `json:"joined_date"`
	Phone          string `json:"phone"`
	CreatedAt      string `json:"created_at"`
}

type TeacherSubjectResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Code string `json:"code"`
}
