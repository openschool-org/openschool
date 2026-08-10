package models

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
