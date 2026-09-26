// Package notifications owns notification contracts and delivery workflows.
package notifications

import (
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"time"
)

type RecipientRuleType string

const (
	RuleEveryone     RecipientRuleType = "everyone"
	RuleGrade        RecipientRuleType = "grade"
	RuleClass        RecipientRuleType = "class"
	RuleGradeSection RecipientRuleType = "grade_section"
	RuleSubject      RecipientRuleType = "subject"
	RuleStudent      RecipientRuleType = "student"
	RuleGuardian     RecipientRuleType = "guardian"
	RuleTeacher      RecipientRuleType = "teacher"
)

type SubjectAudience string

const (
	AudienceStudents SubjectAudience = "students"
	AudienceTeachers SubjectAudience = "teachers"
)

const (
	StatusDraft = "draft"
	StatusSent  = "sent"
)

// RecipientRule is one targeting criterion picked in the composer; a
// notification combines one or more of these, unioned together at send
// time. Label is display-only (e.g. "Grade 10"), filled in by the
// frontend so a sent notification's audience can be shown back without
// re-resolving IDs to names.
type RecipientRule struct {
	Type            RecipientRuleType `json:"type"`
	Label           string            `json:"label,omitempty"`
	GradeID         *uuid.UUID        `json:"grade_id,omitempty"`
	ClassID         *uuid.UUID        `json:"class_id,omitempty"`
	GradeSectionID  *uuid.UUID        `json:"grade_section_id,omitempty"`
	SubjectID       *uuid.UUID        `json:"subject_id,omitempty"`
	SubjectAudience SubjectAudience   `json:"subject_audience,omitempty"`
	StudentID       *uuid.UUID        `json:"student_id,omitempty"`
	GuardianID      *uuid.UUID        `json:"guardian_id,omitempty"`
	TeacherID       *uuid.UUID        `json:"teacher_id,omitempty"`
}

type CreateNotificationRequest struct {
	Title          string          `json:"title" binding:"required"`
	Message        string          `json:"message" binding:"required"`
	Category       string          `json:"category" binding:"required"`
	Priority       string          `json:"priority" binding:"required"`
	SaveAsDraft    bool            `json:"save_as_draft"`
	RecipientRules []RecipientRule `json:"recipient_rules" binding:"required,min=1"`
}

type UpdateNotificationRequest struct {
	Title          string          `json:"title" binding:"required"`
	Message        string          `json:"message" binding:"required"`
	Category       string          `json:"category" binding:"required"`
	Priority       string          `json:"priority" binding:"required"`
	RecipientRules []RecipientRule `json:"recipient_rules" binding:"required,min=1"`
}

type NotificationResponse struct {
	ID             uuid.UUID          `json:"id"`
	Title          string             `json:"title"`
	Message        string             `json:"message"`
	Category       string             `json:"category"`
	Priority       string             `json:"priority"`
	Status         string             `json:"status"`
	RecipientRules []RecipientRule    `json:"recipient_rules"`
	SenderName     string             `json:"sender_name,omitempty"`
	SentAt         pgtype.Timestamptz `json:"sent_at"`
	CreatedAt      pgtype.Timestamptz `json:"created_at"`
}

type NotificationStatsResponse struct {
	Total  int32 `json:"total"`
	Read   int32 `json:"read"`
	Unread int32 `json:"unread"`
}

type MyNotificationResponse struct {
	RecipientID    uuid.UUID          `json:"recipient_id"`
	NotificationID uuid.UUID          `json:"notification_id"`
	Title          string             `json:"title"`
	Message        string             `json:"message"`
	Category       string             `json:"category"`
	Priority       string             `json:"priority"`
	SenderName     string             `json:"sender_name"`
	SentAt         pgtype.Timestamptz `json:"sent_at"`
	IsRead         bool               `json:"is_read"`
	IsArchived     bool               `json:"is_archived"`
}

var ValidCategories = map[string]bool{
	"general": true, "academic": true, "examination": true, "attendance": true,
	"timetable": true, "events": true, "sports": true, "meetings": true,
	"fee_reminder": true, "emergency": true, "discipline": true, "holidays": true,
}

var ValidPriorities = map[string]bool{"normal": true, "important": true, "urgent": true}

// HistoryFilter pages the sent-notification history; SenderID is forced for teachers.
type HistoryFilter struct {
	SenderID                   *uuid.UUID
	Search, Category, Priority string
	From, To                   *time.Time
	Limit, Offset              int32
}

type HistoryItem struct {
	ID             uuid.UUID          `json:"id"`
	Title          string             `json:"title"`
	Message        string             `json:"message"`
	Category       string             `json:"category"`
	Priority       string             `json:"priority"`
	SenderName     string             `json:"sender_name"`
	SentAt         pgtype.Timestamptz `json:"sent_at"`
	RecipientCount int32              `json:"recipient_count"`
	ReadCount      int32              `json:"read_count"`
}

type HistoryPage struct {
	Items  []HistoryItem `json:"items"`
	Total  int64         `json:"total"`
	Limit  int32         `json:"limit"`
	Offset int32         `json:"offset"`
}

// InboxFilter pages one box of the caller's inbox.
type InboxFilter struct {
	Box              string
	Search, Category string
	Limit, Offset    int32
}

type InboxCounts struct {
	Unread   int32 `json:"unread"`
	Read     int32 `json:"read"`
	Archived int32 `json:"archived"`
}

type InboxPage struct {
	Items  []MyNotificationResponse `json:"items"`
	Total  int64                    `json:"total"`
	Limit  int32                    `json:"limit"`
	Offset int32                    `json:"offset"`
	Counts InboxCounts              `json:"counts"`
}

var validBoxes = map[string]bool{"unread": true, "read": true, "archived": true}
