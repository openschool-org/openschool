package models

import "time"

// AttendanceReportRequest drives the attendance PDF export — one row per
// attendance record for the class across the date range.
type AttendanceReportRequest struct {
	ClassID string    `form:"class_id" binding:"required"`
	From    time.Time `form:"from" binding:"required" time_format:"2006-01-02"`
	To      time.Time `form:"to" binding:"required" time_format:"2006-01-02"`
	// Columns is an optional subset of: date, student, index_number, status, note.
	// Empty means "all columns".
	Columns []string `form:"columns"`
}

// MarksReportRequest drives the marks PDF export — one row per student's
// mark for a class+term+subject.
type MarksReportRequest struct {
	ClassID   string `form:"class_id" binding:"required"`
	TermID    string `form:"term_id" binding:"required"`
	SubjectID string `form:"subject_id" binding:"required"`
	// Columns is an optional subset of: student, index_number, marks, max_marks, percentage.
	Columns []string `form:"columns"`
}
