package models

type CreateGuardianRequest struct {
	FullName     string `json:"full_name" binding:"required"`
	Relationship string `json:"relationship" binding:"required"`
	Phone        string `json:"phone" binding:"required"`
	Email        string `json:"email"`
}

type UpdateGuardianRequest struct {
	FullName     string `json:"full_name" binding:"required"`
	Relationship string `json:"relationship" binding:"required"`
	Phone        string `json:"phone" binding:"required"`
	Email        string `json:"email"`
}

type LinkGuardianRequest struct {
	GuardianID       string `json:"guardian_id" binding:"required"`
	IsPrimaryContact bool   `json:"is_primary_contact"`
}

type GuardianResponse struct {
	ID           string `json:"id"`
	FullName     string `json:"full_name"`
	Relationship string `json:"relationship"`
	Phone        string `json:"phone"`
	Email        string `json:"email"`
	CreatedAt    string `json:"created_at"`
}

type GuardianWithPrimaryResponse struct {
	GuardianResponse
	IsPrimaryContact bool `json:"is_primary_contact"`
}
