package models

type CreateStudentRequest struct {
	// Asgardeo account fields
	Email       string `json:"email" binding:"required,email"`
	GivenName   string `json:"given_name" binding:"required"`
	FamilyName  string `json:"family_name" binding:"required"`
	PhoneNumber string `json:"phone_number"`
	Password    string `json:"password" binding:"required,min=8"`

	// Student profile fields
	IndexNumber    string `json:"index_number" binding:"required"`
	Address        string `json:"address"`
	WhatsApp       string `json:"whatsapp"`
	SpecialRemarks string `json:"special_remarks"`
	// Gender is optional; when set it must be one of the DB's allowed values.
	Gender string `json:"gender" binding:"omitempty,oneof=male female"`
}

type UpdateStudentRequest struct {
	GivenName      string `json:"given_name" binding:"required"`
	FamilyName     string `json:"family_name" binding:"required"`
	PhoneNumber    string `json:"phone_number"`
	Address        string `json:"address"`
	WhatsApp       string `json:"whatsapp"`
	SpecialRemarks string `json:"special_remarks"`
	Gender         string `json:"gender" binding:"omitempty,oneof=male female"`
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
