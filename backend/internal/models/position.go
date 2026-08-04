package models

// AssignPrincipalRequest sets the school's Principal. This is a permanent
// appointment (not scoped to an academic year) — any existing Principal is
// replaced, and if the new Principal was previously a Vice Principal that
// row is cleared.
type AssignPrincipalRequest struct {
	TeacherID string `json:"teacher_id" binding:"required"`
}

// AssignVicePrincipalRequest upserts a Vice Principal. This is a permanent
// appointment (not scoped to an academic year) — it lasts until resignation
// or promotion, at which point an admin removes/reassigns it. When
// NotifyWholeSchool is true, GradeIDs is ignored (whole-school grant takes
// precedence). Otherwise GradeIDs is the set of grades this Vice Principal
// is authorized to notify, replacing any previous scope.
type AssignVicePrincipalRequest struct {
	TeacherID         string   `json:"teacher_id" binding:"required"`
	NotifyWholeSchool bool     `json:"notify_whole_school"`
	GradeIDs          []string `json:"grade_ids"`
}
