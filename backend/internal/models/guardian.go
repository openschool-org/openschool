package models

type CreateGuardianRequest struct {
	FullName     string `json:"full_name" binding:"required"`
	Relationship string `json:"relationship" binding:"required"`
	Phone        string `json:"phone" binding:"required"`
	Email        string `json:"email"`
	NICNumber    string `json:"nic_number" binding:"required"`
}

type UpdateGuardianRequest struct {
	FullName     string `json:"full_name" binding:"required"`
	Relationship string `json:"relationship" binding:"required"`
	Phone        string `json:"phone" binding:"required"`
	Email        string `json:"email"`
	NICNumber    string `json:"nic_number" binding:"required"`
}

// ProvisionGuardianLoginRequest no longer collects a password — the
// guardian's NIC number (already on file from CreateGuardianRequest)
// becomes their initial (one-time) portal password (Phase 8.2).
type ProvisionGuardianLoginRequest struct {
	Username   string `json:"username" binding:"required"`
	GivenName  string `json:"given_name" binding:"required"`
	FamilyName string `json:"family_name" binding:"required"`
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
	NICNumber    string `json:"nic_number"`
	CreatedAt    string `json:"created_at"`
}

type GuardianWithPrimaryResponse struct {
	GuardianResponse
	IsPrimaryContact bool `json:"is_primary_contact"`
}
