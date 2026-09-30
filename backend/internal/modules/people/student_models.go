package people

type CreateStudentRequest struct {
	// ThunderID account fields
	Email string `json:"email" binding:"required,email"`
	// Sri Lankan names don't split into first and last: the full name, the name with initials
	// (suggested from the full name when empty) and an optional calling name.
	FullName         string `json:"full_name" binding:"required,max=255"`
	NameWithInitials string `json:"name_with_initials" binding:"max=255"`
	CallingName      string `json:"calling_name" binding:"max=100"`
	PhoneNumber      string `json:"phone_number"`
	// Password is no longer collected — the student's index number becomes
	// their initial (one-time) password (Phase 8.2).

	// Student profile fields
	IndexNumber    string `json:"index_number" binding:"required"`
	Address        string `json:"address"`
	WhatsApp       string `json:"whatsapp"`
	SpecialRemarks string `json:"special_remarks"`
	// Gender is optional; when set it must be one of the DB's allowed values.
	Gender string `json:"gender" binding:"omitempty,oneof=male female"`
}

type UpdateStudentRequest struct {
	// Sri Lankan names don't split into first and last: the full name, the name with initials
	// (suggested from the full name when empty) and an optional calling name.
	FullName         string `json:"full_name" binding:"required,max=255"`
	NameWithInitials string `json:"name_with_initials" binding:"max=255"`
	CallingName      string `json:"calling_name" binding:"max=100"`
	PhoneNumber      string `json:"phone_number"`
	Address          string `json:"address"`
	WhatsApp         string `json:"whatsapp"`
	SpecialRemarks   string `json:"special_remarks"`
	Gender           string `json:"gender" binding:"omitempty,oneof=male female"`
}

type UpdateStudentEnrollmentStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=active left"`
}

type UpdateStudentHouseRequest struct {
	HouseID string `json:"house_id"`
}

type StudentResponse struct {
	ID             string `json:"id"`
	UserID         string `json:"user_id"`
	FullName       string `json:"full_name"`
	IndexNumber    string `json:"index_number"`
	Address        string `json:"address"`
	Phone          string `json:"phone"`
	WhatsApp       string `json:"whatsapp"`
	SpecialRemarks string `json:"special_remarks"`
	Gender         string `json:"gender"`
	CreatedAt      string `json:"created_at"`
}

type StudentWithClassResponse struct {
	StudentResponse
	ClassName    string `json:"class_name"`
	GradeName    string `json:"grade_name"`
	AcademicYear string `json:"academic_year"`
}
