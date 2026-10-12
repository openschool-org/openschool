package leave

import (
	"time"

	"github.com/google/uuid"
)

// ApplyRequest is a teacher's leave application. Dates are YYYY-MM-DD;
// start_time and end_time (HH:MM) are only for short leave.
type ApplyRequest struct {
	LeaveType       string        `json:"leave_type" binding:"required,oneof=casual sick duty maternity no_pay short"`
	StartDate       string        `json:"start_date" binding:"required"`
	EndDate         string        `json:"end_date" binding:"required"`
	DayPart         string        `json:"day_part" binding:"omitempty,oneof=full morning afternoon"`
	StartTime       string        `json:"start_time"`
	EndTime         string        `json:"end_time"`
	Reason          string        `json:"reason" binding:"required,max=1000"`
	ActingTeacherID string        `json:"acting_teacher_id"`
	Relief          []ReliefInput `json:"relief" binding:"max=400,dive"`
}

// ReliefInput names who takes one class in one period while the applicant is away.
type ReliefInput struct {
	Date            string `json:"date" binding:"required"`
	PeriodNumber    int16  `json:"period_number" binding:"required,min=1"`
	ClassID         string `json:"class_id" binding:"required"`
	SubjectID       string `json:"subject_id"`
	ReliefTeacherID string `json:"relief_teacher_id"`
}

// DecisionRequest approves or rejects a pending application. A rejection needs a note.
type DecisionRequest struct {
	Note string `json:"note" binding:"max=1000"`
}

// Application is a validated ApplyRequest.
type Application struct {
	TeacherID          uuid.UUID
	LeaveType, DayPart string
	Start, End         time.Time
	// StartTime and EndTime are HH:MM, set only for short leave.
	StartTime, EndTime string
	Reason             string
	ActingTeacherID    uuid.UUID
	Days               float64
	Relief             []Relief
}

type Relief struct {
	Date            time.Time
	PeriodNumber    int16
	ClassID         uuid.UUID
	SubjectID       uuid.UUID
	ReliefTeacherID uuid.UUID
}

// Request is one row of the leave register.
type Request struct {
	ID                uuid.UUID  `json:"id"`
	TeacherID         uuid.UUID  `json:"teacher_id"`
	TeacherName       string     `json:"teacher_name"`
	EmployeeNumber    string     `json:"employee_number"`
	LeaveType         string     `json:"leave_type"`
	StartDate         string     `json:"start_date"`
	EndDate           string     `json:"end_date"`
	DayPart           string     `json:"day_part"`
	StartTime         string     `json:"start_time,omitempty"`
	EndTime           string     `json:"end_time,omitempty"`
	Days              float64    `json:"days"`
	Reason            string     `json:"reason"`
	ActingTeacherID   *uuid.UUID `json:"acting_teacher_id"`
	ActingTeacherName string     `json:"acting_teacher_name,omitempty"`
	Status            string     `json:"status"`
	DecidedAt         *time.Time `json:"decided_at"`
	DecidedByName     string     `json:"decided_by_name,omitempty"`
	DecisionNote      string     `json:"decision_note,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	teacherUserID     uuid.UUID
}

// ReliefPeriod is one relief arrangement on an application.
type ReliefPeriod struct {
	ID                uuid.UUID  `json:"id"`
	Date              string     `json:"date"`
	PeriodNumber      int16      `json:"period_number"`
	ClassID           uuid.UUID  `json:"class_id"`
	ClassName         string     `json:"class_name"`
	SubjectID         *uuid.UUID `json:"subject_id"`
	SubjectName       string     `json:"subject_name"`
	ReliefTeacherID   *uuid.UUID `json:"relief_teacher_id"`
	ReliefTeacherName string     `json:"relief_teacher_name"`
}

// RequestDetail is an application with its relief arrangements.
type RequestDetail struct {
	Request
	Relief []ReliefPeriod `json:"relief"`
}

// RequestPage is one page of the leave register.
type RequestPage struct {
	Items  []Request `json:"items"`
	Total  int64     `json:"total"`
	Limit  int32     `json:"limit"`
	Offset int32     `json:"offset"`
}

// RegisterFilter narrows the leave register.
type RegisterFilter struct {
	Year                      int
	TeacherID                 uuid.UUID
	Status, LeaveType, Search string
	Limit, Offset             int32
}

// Usage is the days (or, for short leave, the count) a teacher has
// approved and waiting in one leave type.
type Usage struct{ Approved, Pending float64 }

// BalanceItem is one leave type in a teacher's balance. Entitlement is 0
// for types with no yearly allowance; Remaining is then omitted.
type BalanceItem struct {
	LeaveType   string   `json:"leave_type"`
	Entitlement float64  `json:"entitlement"`
	Used        float64  `json:"used"`
	Pending     float64  `json:"pending"`
	Remaining   *float64 `json:"remaining"`
}

// Balance is a teacher's leave for one calendar year. Short leave is
// counted for the current month, since its limit is monthly.
type Balance struct {
	Year            int           `json:"year"`
	Items           []BalanceItem `json:"items"`
	ShortLeaveMonth BalanceItem   `json:"short_leave_month"`
}

// TeacherBalance is one row of the school-wide balances register.
type TeacherBalance struct {
	TeacherID      uuid.UUID `json:"teacher_id"`
	TeacherName    string    `json:"teacher_name"`
	EmployeeNumber string    `json:"employee_number"`
	CasualDays     float64   `json:"casual_days"`
	SickDays       float64   `json:"sick_days"`
	DutyDays       float64   `json:"duty_days"`
	MaternityDays  float64   `json:"maternity_days"`
	NoPayDays      float64   `json:"no_pay_days"`
	ShortCount     int64     `json:"short_count"`
}

type BalancePage struct {
	Items  []TeacherBalance `json:"items"`
	Total  int64            `json:"total"`
	Limit  int32            `json:"limit"`
	Offset int32            `json:"offset"`
}

// periodSlot is one weekly timetable period the teacher takes.
type periodSlot struct {
	DayOfWeek     int16
	PeriodNumber  int16
	ClassID       uuid.UUID
	ClassName     string
	SubjectID     uuid.UUID
	SubjectName   string
	StartTime     string
	EndTime       string
	AfterInterval bool
}

// AffectedPeriod is a dated period the applicant will miss, for the relief section of the form.
type AffectedPeriod struct {
	Date         string     `json:"date"`
	PeriodNumber int16      `json:"period_number"`
	StartTime    string     `json:"start_time"`
	EndTime      string     `json:"end_time"`
	ClassID      uuid.UUID  `json:"class_id"`
	ClassName    string     `json:"class_name"`
	SubjectID    *uuid.UUID `json:"subject_id"`
	SubjectName  string     `json:"subject_name"`
}

// AffectedPeriods is the relief section of the form. Truncated is set
// when the leave is longer than MaxReliefDays and only the first days are listed.
type AffectedPeriods struct {
	Items     []AffectedPeriod `json:"items"`
	Truncated bool             `json:"truncated"`
}

// ReliefCandidate is a teacher free to take a period.
type ReliefCandidate struct {
	ID             uuid.UUID `json:"id"`
	FullName       string    `json:"full_name"`
	EmployeeNumber string    `json:"employee_number"`
	// ReliefPeriods already assigned to them that day, so duty is shared out.
	ReliefPeriods int64 `json:"relief_periods"`
}

// DailyRelief is one line of the day's relief sheet.
type DailyRelief struct {
	ID                uuid.UUID  `json:"id"`
	PeriodNumber      int16      `json:"period_number"`
	LeaveRequestID    uuid.UUID  `json:"leave_request_id"`
	LeaveStatus       string     `json:"leave_status"`
	LeaveType         string     `json:"leave_type"`
	AbsentTeacherName string     `json:"absent_teacher_name"`
	ClassID           uuid.UUID  `json:"class_id"`
	ClassName         string     `json:"class_name"`
	SubjectName       string     `json:"subject_name"`
	ReliefTeacherID   *uuid.UUID `json:"relief_teacher_id"`
	ReliefTeacherName string     `json:"relief_teacher_name"`
}

// ReliefDuty is a period the signed-in teacher has been named to cover.
type ReliefDuty struct {
	ID                uuid.UUID `json:"id"`
	Date              string    `json:"date"`
	PeriodNumber      int16     `json:"period_number"`
	AbsentTeacherName string    `json:"absent_teacher_name"`
	ClassName         string    `json:"class_name"`
	SubjectName       string    `json:"subject_name"`
}
