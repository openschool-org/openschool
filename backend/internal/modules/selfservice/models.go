package selfservice

import (
	"time"

	"github.com/google/uuid"
)

// StudentProfile is the signed-in student's self-service profile payload.
type StudentProfile struct {
	ID               uuid.UUID  `json:"id"`
	UserID           *uuid.UUID `json:"user_id"`
	FullName         string     `json:"full_name"`
	NameWithInitials string     `json:"name_with_initials"`
	CallingName      string     `json:"calling_name"`
	IndexNumber      string     `json:"index_number"`
	Address          *string    `json:"address"`
	Phone            *string    `json:"phone"`
	WhatsApp         *string    `json:"whatsapp"`
	SpecialRemarks   *string    `json:"special_remarks"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	Gender           *string    `json:"gender"`
	HouseID          *uuid.UUID `json:"house_id"`
	EnrollmentStatus string     `json:"enrollment_status"`
	Email            *string    `json:"email"`
	ClassName        *string    `json:"class_name"`
	GradeName        *string    `json:"grade_name"`
	HouseName        *string    `json:"house_name"`
	AcademicYear     *string    `json:"academic_year"`
}

// TeacherProfile is the signed-in teacher's self-service profile payload.
type TeacherProfile struct {
	ID               uuid.UUID  `json:"id"`
	UserID           uuid.UUID  `json:"user_id"`
	FullName         string     `json:"full_name"`
	NameWithInitials string     `json:"name_with_initials"`
	CallingName      string     `json:"calling_name"`
	EmployeeNumber   string     `json:"employee_number"`
	JoinedDate       string     `json:"joined_date"`
	Phone            *string    `json:"phone"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	Title            *string    `json:"title"`
	Gender           *string    `json:"gender"`
	IsActive         bool       `json:"is_active"`
	HouseID          *uuid.UUID `json:"house_id"`
	EmploymentStatus string     `json:"employment_status"`
	NICNumber        string     `json:"nic_number"`
}
