package automation

import (
	"time"

	"github.com/google/uuid"
)

// JobLastRun is the most recent execution of a background job, for the
// admin Automation panel.
type JobLastRun struct {
	Status     string     `json:"status"`
	Summary    string     `json:"summary"`
	Findings   int32      `json:"findings"`
	StartedAt  time.Time  `json:"started_at"`
	FinishedAt *time.Time `json:"finished_at,omitempty"`
}

// JobStatus is one registered background job's static definition plus its
// current on/off state and last run, if any.
type JobStatus struct {
	Name        string      `json:"name"`
	Title       string      `json:"title"`
	Description string      `json:"description"`
	CanDisable  bool        `json:"can_disable"`
	Checks      []CheckInfo `json:"checks"`
	Schedule    string      `json:"schedule"`
	// ScheduleLabel is the schedule in words, so the panel never parses cron itself.
	ScheduleLabel string      `json:"schedule_label"`
	Enabled       bool        `json:"enabled"`
	LastRun       *JobLastRun `json:"last_run,omitempty"`
}

type SetJobEnabledRequest struct {
	Enabled bool `json:"enabled"`
}

// The types below are module-owned projections used by automated checks.
// Keeping sqlc-generated rows behind repository.go prevents persistence
// details from leaking into the checking algorithms.
type academicYear struct{ Label string }

type personReference struct {
	FullName    string
	IndexNumber string
}

type namedReference struct{ Name string }

type teacherAssignment struct {
	FullName         string
	EmploymentStatus string
}

type classReference struct {
	Name      string
	GradeName string
}

type termDeadline struct {
	Name              string
	EndDate           time.Time
	AcademicYearLabel string
}

type incompleteSession struct {
	ClassName   string
	Date        time.Time
	CreatedAt   time.Time
	RecordCount int64
	RosterSize  int64
}

type staleAccount struct {
	FullName  string
	Email     string
	CreatedAt time.Time
}

type termMarksProgress struct {
	Name              string
	StartDate         time.Time
	EndDate           time.Time
	AcademicYearLabel string
	EnrolledStudents  int64
	StudentsWithMarks int64
}

type attendanceCompliance struct {
	Name               string
	GradeName          string
	SessionsTaken      int64
	SchoolDaysInWindow int64
}

type auditBaseline struct {
	ActorID       uuid.UUID
	FullName      string
	MeanPerHour   float64
	StddevPerHour float64
	HoursObserved int64
}

type auditActivity struct {
	ActorID     uuid.UUID
	FullName    string
	ChangeCount int64
}

type offHoursActivity struct {
	FullName    string
	ChangeCount int64
	FirstSeen   time.Time
	LastSeen    time.Time
}

type jobSetting struct {
	JobName string
	Enabled bool
}

type jobRun struct {
	ID         uuid.UUID
	JobName    string
	StartedAt  time.Time
	FinishedAt *time.Time
	Status     string
	Summary    string
	Findings   int32
}

// Finding is an agent notice shown as a banner on the page it applies to.
type Finding struct {
	NotificationID string `json:"notification_id"`
	Agent          string `json:"agent"`
	Check          string `json:"check"`
	Title          string `json:"title"`
	Message        string `json:"message"`
	SentAt         string `json:"sent_at"`
}
