package attendance

import "time"

var ValidStaffAttendanceStatuses = map[string]bool{
	"present": true,
	"late":    true,
	"absent":  true,
	"leave":   true,
}

type MarkStaffAttendanceRequest struct {
	TeacherID          string    `json:"teacher_id"`
	NonAcademicStaffID string    `json:"non_academic_staff_id"`
	Date               time.Time `json:"date" binding:"required"`
	Status             string    `json:"status" binding:"required,oneof=present late absent leave"`
	Note               string    `json:"note"`
}

type StaffAttendanceRow struct {
	StaffID        string `json:"staff_id"`
	FullName       string `json:"full_name"`
	EmployeeNumber string `json:"employee_number"`
	RecordID       string `json:"record_id,omitempty"`
	Status         string `json:"status,omitempty"`
	Note           string `json:"note,omitempty"`
}

type StaffAttendanceSummaryRow struct {
	StaffID      string `json:"staff_id"`
	FullName     string `json:"full_name"`
	PresentCount int64  `json:"present_count"`
	LateCount    int64  `json:"late_count"`
	AbsentCount  int64  `json:"absent_count"`
	LeaveCount   int64  `json:"leave_count"`
}

// StaffKind selects teachers or non-academic staff on the paged endpoints.
type StaffKind string

const (
	StaffKindTeacher StaffKind = "teacher"
	StaffKindStaff   StaffKind = "staff"
)

// StaffRosterQuery is one page of the daily roster or monthly summary.
type StaffRosterQuery struct {
	Kind          StaffKind
	Search        string
	Limit, Offset int32
}

// StaffStatusTotals counts the whole filtered roster for the day, not just the page.
type StaffStatusTotals struct {
	Present  int64 `json:"present"`
	Late     int64 `json:"late"`
	Absent   int64 `json:"absent"`
	Leave    int64 `json:"leave"`
	Unmarked int64 `json:"unmarked"`
}

type StaffRosterPage struct {
	Items  []StaffAttendanceRow `json:"items"`
	Total  int64                `json:"total"`
	Limit  int32                `json:"limit"`
	Offset int32                `json:"offset"`
	Totals StaffStatusTotals    `json:"totals"`
}

type StaffMonthlyPage struct {
	Items  []StaffAttendanceSummaryRow `json:"items"`
	Total  int64                       `json:"total"`
	Limit  int32                       `json:"limit"`
	Offset int32                       `json:"offset"`
}

type MarkUnmarkedRequest struct {
	Date time.Time `json:"date" binding:"required"`
	Kind StaffKind `json:"kind" binding:"required,oneof=teacher staff"`
}
