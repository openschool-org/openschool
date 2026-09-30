package people

type CreateGuardianRequest struct {
	// Sri Lankan names don't split into first and last: the full name, the name with initials
	// (suggested from the full name when empty) and an optional calling name.
	FullName         string `json:"full_name" binding:"required,max=255"`
	NameWithInitials string `json:"name_with_initials" binding:"max=255"`
	CallingName      string `json:"calling_name" binding:"max=100"`
	Relationship     string `json:"relationship" binding:"required"`
	Phone            string `json:"phone" binding:"required"`
	Email            string `json:"email"`
	NICNumber        string `json:"nic_number" binding:"required"`
}

type UpdateGuardianRequest struct {
	// Sri Lankan names don't split into first and last: the full name, the name with initials
	// (suggested from the full name when empty) and an optional calling name.
	FullName         string `json:"full_name" binding:"required,max=255"`
	NameWithInitials string `json:"name_with_initials" binding:"max=255"`
	CallingName      string `json:"calling_name" binding:"max=100"`
	Relationship     string `json:"relationship" binding:"required"`
	Phone            string `json:"phone" binding:"required"`
	Email            string `json:"email"`
	NICNumber        string `json:"nic_number" binding:"required"`
}

// ProvisionGuardianLoginRequest no longer collects a password — the
// guardian's NIC number (already on file from CreateGuardianRequest)
// becomes their initial (one-time) portal password (Phase 8.2). Names come
// from the guardian record, so they are not asked for again.
type ProvisionGuardianLoginRequest struct {
	Username string `json:"username" binding:"required"`
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
