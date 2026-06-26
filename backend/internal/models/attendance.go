package models

type CreateAttendanceSessionRequest struct {
	ClassID string `json:"class_id" binding:"required"`
	Date    string `json:"date" binding:"required"`
}

type AttendanceRecord struct {
	StudentID string `json:"student_id" binding:"required"`
	Status    string `json:"status" binding:"required"`
	Note      string `json:"note"`
}

type MarkAttendanceRequest struct {
	Records []AttendanceRecord `json:"records" binding:"required"`
}

type AttendanceSessionResponse struct {
	ID        string `json:"id"`
	ClassID   string `json:"class_id"`
	TakenBy   string `json:"taken_by"`
	Date      string `json:"date"`
	CreatedAt string `json:"created_at"`
}

type AttendanceRecordResponse struct {
	ID           string `json:"id"`
	SessionID    string `json:"session_id"`
	StudentID    string `json:"student_id"`
	StudentName  string `json:"student_name"`
	StudentIndex string `json:"student_index"`
	Status       string `json:"status"`
	Note         string `json:"note"`
}

type AttendanceSummaryResponse struct {
	TotalDays int64 `json:"total_days"`
	Present   int64 `json:"present"`
	Absent    int64 `json:"absent"`
	Late      int64 `json:"late"`
	Excused   int64 `json:"excused"`
}
