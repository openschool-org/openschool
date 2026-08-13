package models

// CreateSocietyRequest creates a new society (club) for an academic year,
// admin-only. Rename or TIC reassignment happens via UpdateSocietyRequest.
type CreateSocietyRequest struct {
	Name              string `json:"name" binding:"required"`
	TeacherInChargeID string `json:"teacher_in_charge_id" binding:"required"`
	AcademicYearID    string `json:"academic_year_id" binding:"required"`
}

// UpdateSocietyRequest renames a society or reassigns its Teacher-in-Charge,
// admin-only. The academic year a society belongs to is immutable — create a
// new society for a new year instead, the same convention prefects/section
// heads use.
type UpdateSocietyRequest struct {
	Name              string `json:"name" binding:"required"`
	TeacherInChargeID string `json:"teacher_in_charge_id" binding:"required"`
}

// AssignSocietyMemberRequest appoints (or re-appoints, changing role) a
// student to a society's roster. The society is taken from the URL path,
// and the membership's academic_year_id is always the society's own year
// (SocietyService.AssignMember) — never client-supplied, so a caller can't
// create a membership row whose year doesn't match its society. Only the
// society's Teacher-in-Charge (or an admin) may call this — enforced in the
// service layer, not here. Role must be one of: leader, deputy_leader,
// secretary, treasurer, member.
type AssignSocietyMemberRequest struct {
	StudentID string `json:"student_id" binding:"required"`
	Role      string `json:"role" binding:"required,oneof=leader deputy_leader secretary treasurer member"`
}
