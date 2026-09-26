package notifications

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/openschool-org/openschool/internal/authz"
)

var (
	ErrNotificationNotFound = errors.New("notification not found")
	ErrForbiddenRecipients  = errors.New("you are not authorized to notify one or more of the selected recipients")
	ErrNotADraft            = errors.New("this action only applies to draft notifications")
)

type NotificationService struct {
	repo store
}

func NewNotificationService(repo store) *NotificationService {
	return &NotificationService{repo: repo}
}

type notification struct {
	ID                                         uuid.UUID
	Title, Message, Category, Priority, Status string
	RecipientRules                             []byte
	CreatedBy                                  uuid.UUID
	SentAt, CreatedAt, UpdatedAt               pgtype.Timestamptz
}
type notificationCommand struct {
	ID                                         uuid.UUID
	Title, Message, Category, Priority, Status string
	RecipientRules                             []byte
	CreatedBy                                  uuid.UUID
	SentAt                                     pgtype.Timestamptz
}
type sentNotification struct {
	notification
	SenderName string
}
type recipientNotification struct {
	RecipientID, NotificationID                    uuid.UUID
	Title, Message, Category, Priority, SenderName string
	SentAt                                         pgtype.Timestamptz
	IsRead, IsArchived                             bool
}
type recipientStats struct{ Total, Read int32 }

type store interface {
	Create(context.Context, notificationCommand) (notification, error)
	UpdateDraft(context.Context, notificationCommand) (notification, error)
	MarkSent(context.Context, uuid.UUID) (notification, error)
	GetByID(context.Context, uuid.UUID) (notification, error)
	DeleteDraft(context.Context, uuid.UUID) (int64, error)
	ListSentByUser(context.Context, uuid.UUID) ([]sentNotification, error)
	ListAllSent(context.Context) ([]sentNotification, error)
	ListMyDrafts(context.Context, uuid.UUID) ([]notification, error)
	GetStats(context.Context, uuid.UUID) (recipientStats, error)
	AddRecipient(context.Context, uuid.UUID, uuid.UUID) error
	ListMine(context.Context, uuid.UUID) ([]recipientNotification, error)
	ListMyArchived(context.Context, uuid.UUID) ([]recipientNotification, error)
	CountMyUnread(context.Context, uuid.UUID) (int64, error)
	MarkRead(context.Context, uuid.UUID, uuid.UUID) error
	MarkAllRead(context.Context, uuid.UUID) error
	SetArchived(context.Context, uuid.UUID, uuid.UUID, bool) error
	ListAllUserIDs(context.Context) ([]uuid.UUID, error)
	ListStudentUserIDsByClass(context.Context, uuid.UUID) ([]pgtype.UUID, error)
	ListGuardianUserIDsByClass(context.Context, uuid.UUID) ([]pgtype.UUID, error)
	ListTeacherUserIDsByClass(context.Context, uuid.UUID) ([]uuid.UUID, error)
	ListClassIDsByGrade(context.Context, uuid.UUID, uuid.UUID) ([]uuid.UUID, error)
	ListTeacherUserIDsBySubject(context.Context, uuid.UUID) ([]uuid.UUID, error)
	ListStudentUserIDsBySubject(context.Context, uuid.UUID, uuid.UUID) ([]pgtype.UUID, error)
	ListStudentIDsByGuardian(context.Context, uuid.UUID) ([]uuid.UUID, error)
	IsTeacherAssignedToSubject(context.Context, uuid.UUID, uuid.UUID) (bool, error)
	CurrentAcademicYearID(context.Context) (uuid.UUID, error)
	ListGradeIDs(context.Context, uuid.UUID) ([]uuid.UUID, error)
	GetGradeTIC(context.Context, uuid.UUID, uuid.UUID) (uuid.UUID, error)
	GetGradeSectionHead(context.Context, uuid.UUID, uuid.UUID) (pgtype.UUID, error)
	IsVicePrincipalAuthorizedForGrade(context.Context, uuid.UUID, uuid.UUID) (bool, error)
	TeacherIDByUser(context.Context, uuid.UUID) (uuid.UUID, error)
	IsPrincipal(context.Context, uuid.UUID) (bool, error)
	IsTeacherAssignedToClass(context.Context, uuid.UUID, uuid.UUID) (bool, error)
	StudentCurrentClass(context.Context, uuid.UUID) (uuid.UUID, error)
	IsTeacherAssignedToAnyStudentClass(context.Context, []uuid.UUID, uuid.UUID) (bool, error)
	StudentUserID(context.Context, uuid.UUID) (pgtype.UUID, error)
	GuardianUserID(context.Context, uuid.UUID) (pgtype.UUID, error)
	TeacherUserID(context.Context, uuid.UUID) (uuid.UUID, error)
}

func addUUID(seen map[uuid.UUID]bool, out *[]uuid.UUID, id uuid.UUID) {
	if !seen[id] {
		seen[id] = true
		*out = append(*out, id)
	}
}

func addPgUUID(seen map[uuid.UUID]bool, out *[]uuid.UUID, id pgtype.UUID) {
	if id.Valid {
		addUUID(seen, out, uuid.UUID(id.Bytes))
	}
}

func (s *NotificationService) currentAcademicYearID(ctx context.Context) (uuid.UUID, error) {
	yearID, err := s.repo.CurrentAcademicYearID(ctx)
	if err != nil {
		return uuid.UUID{}, fmt.Errorf("no current academic year configured")
	}
	return yearID, nil
}

// gradesForRule expands a grade/grade_section rule into the concrete
// grade IDs it covers.
func (s *NotificationService) gradesForRule(ctx context.Context, rule RecipientRule) ([]uuid.UUID, error) {
	switch rule.Type {
	case RuleGrade:
		if rule.GradeID == nil {
			return nil, nil
		}
		return []uuid.UUID{*rule.GradeID}, nil
	case RuleGradeSection:
		if rule.GradeSectionID == nil {
			return nil, nil
		}
		grades, err := s.repo.ListGradeIDs(ctx, *rule.GradeSectionID)
		if err != nil {
			return nil, err
		}
		return grades, nil
	default:
		return nil, nil
	}
}

// isTeacherAuthorizedForGrade mirrors the section-head resolution used to gate timetable review: either the grade's per-grade TIC or its grade_sections group head may notify that grade's members.
func (s *NotificationService) isTeacherAuthorizedForGrade(ctx context.Context, teacherID, gradeID uuid.UUID) (bool, error) {
	yearID, err := s.currentAcademicYearID(ctx)
	if err != nil {
		return false, err
	}
	if tic, err := s.repo.GetGradeTIC(ctx, yearID, gradeID); err == nil && tic == teacherID {
		return true, nil
	} else if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return false, err
	}
	sectionHead, err := s.repo.GetGradeSectionHead(ctx, yearID, gradeID)
	if err == nil && sectionHead.Valid && uuid.UUID(sectionHead.Bytes) == teacherID {
		return true, nil
	} else if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return false, err
	}
	if authorized, err := s.repo.IsVicePrincipalAuthorizedForGrade(ctx, teacherID, gradeID); err != nil {
		return false, err
	} else if authorized {
		return true, nil
	}
	return false, nil
}

// authorizeSender enforces that a non-admin sender only targets audiences they're actually responsible for: their own classes, grades/sections they head, subjects they teach, and the students/guardians under those.
func (s *NotificationService) authorizeSender(ctx context.Context, callerRole string, callerUserID uuid.UUID, rules []RecipientRule) error {
	if callerRole == authz.RoleAdmin {
		return nil
	}
	if callerRole != authz.RoleTeacher {
		return ErrForbiddenRecipients
	}
	teacherID, err := s.repo.TeacherIDByUser(ctx, callerUserID)
	if err != nil {
		return fmt.Errorf("no teacher profile linked to this account")
	}

	// Principal has the same reach as admin, including RuleEveryone. This is
	// a permanent appointment, not scoped to an academic year.
	if isPrincipal, err := s.repo.IsPrincipal(ctx, teacherID); err != nil {
		return err
	} else if isPrincipal {
		return nil
	}

	for _, rule := range rules {
		switch rule.Type {
		case RuleEveryone:
			return ErrForbiddenRecipients

		case RuleClass:
			if rule.ClassID == nil {
				return ErrForbiddenRecipients
			}
			ok, err := s.repo.IsTeacherAssignedToClass(ctx, *rule.ClassID, teacherID)
			if err != nil || !ok {
				return ErrForbiddenRecipients
			}

		case RuleGrade, RuleGradeSection:
			gradeIDs, err := s.gradesForRule(ctx, rule)
			if err != nil {
				return err
			}
			if len(gradeIDs) == 0 {
				return ErrForbiddenRecipients
			}
			for _, gradeID := range gradeIDs {
				ok, err := s.isTeacherAuthorizedForGrade(ctx, teacherID, gradeID)
				if err != nil {
					return err
				}
				if !ok {
					return ErrForbiddenRecipients
				}
			}

		case RuleSubject:
			if rule.SubjectID == nil || rule.SubjectAudience != AudienceStudents {
				return ErrForbiddenRecipients
			}
			ok, err := s.repo.IsTeacherAssignedToSubject(ctx, teacherID, *rule.SubjectID)
			if err != nil || !ok {
				return ErrForbiddenRecipients
			}

		case RuleStudent:
			if rule.StudentID == nil {
				return ErrForbiddenRecipients
			}
			classID, err := s.repo.StudentCurrentClass(ctx, *rule.StudentID)
			if err != nil {
				return ErrForbiddenRecipients
			}
			ok, err := s.repo.IsTeacherAssignedToClass(ctx, classID, teacherID)
			if err != nil || !ok {
				return ErrForbiddenRecipients
			}

		case RuleGuardian:
			if rule.GuardianID == nil {
				return ErrForbiddenRecipients
			}
			studentIDs, err := s.repo.ListStudentIDsByGuardian(ctx, *rule.GuardianID)
			if err != nil {
				return err
			}
			authorized, err := s.repo.IsTeacherAssignedToAnyStudentClass(ctx, studentIDs, teacherID)
			if err != nil || !authorized {
				return ErrForbiddenRecipients
			}

		case RuleTeacher:
			// colleague-to-colleague messaging is low-risk; any teacher may do it

		default:
			return fmt.Errorf("unknown recipient rule type %q", rule.Type)
		}
	}
	return nil
}

// resolveRecipientUserIDs expands the rule set into the deduplicated set
// of users.id that should receive the notification.
func (s *NotificationService) resolveRecipientUserIDs(ctx context.Context, rules []RecipientRule) ([]uuid.UUID, error) {
	seen := make(map[uuid.UUID]bool)
	var result []uuid.UUID

	resolveClass := func(classID uuid.UUID) error {
		students, err := s.repo.ListStudentUserIDsByClass(ctx, classID)
		if err != nil {
			return err
		}
		for _, u := range students {
			addPgUUID(seen, &result, u)
		}
		guardians, err := s.repo.ListGuardianUserIDsByClass(ctx, classID)
		if err != nil {
			return err
		}
		for _, u := range guardians {
			addPgUUID(seen, &result, u)
		}
		teachers, err := s.repo.ListTeacherUserIDsByClass(ctx, classID)
		if err != nil {
			return err
		}
		for _, u := range teachers {
			addUUID(seen, &result, u)
		}
		return nil
	}

	resolveGrade := func(gradeID uuid.UUID) error {
		yearID, err := s.currentAcademicYearID(ctx)
		if err != nil {
			return err
		}
		classIDs, err := s.repo.ListClassIDsByGrade(ctx, gradeID, yearID)
		if err != nil {
			return err
		}
		for _, classID := range classIDs {
			if err := resolveClass(classID); err != nil {
				return err
			}
		}
		return nil
	}

	for _, rule := range rules {
		switch rule.Type {
		case RuleEveryone:
			ids, err := s.repo.ListAllUserIDs(ctx)
			if err != nil {
				return nil, err
			}
			for _, id := range ids {
				addUUID(seen, &result, id)
			}

		case RuleClass:
			if rule.ClassID == nil {
				continue
			}
			if err := resolveClass(*rule.ClassID); err != nil {
				return nil, err
			}

		case RuleGrade:
			if rule.GradeID == nil {
				continue
			}
			if err := resolveGrade(*rule.GradeID); err != nil {
				return nil, err
			}

		case RuleGradeSection:
			gradeIDs, err := s.gradesForRule(ctx, rule)
			if err != nil {
				return nil, err
			}
			for _, gradeID := range gradeIDs {
				if err := resolveGrade(gradeID); err != nil {
					return nil, err
				}
			}

		case RuleSubject:
			if rule.SubjectID == nil {
				continue
			}
			if rule.SubjectAudience == AudienceTeachers {
				ids, err := s.repo.ListTeacherUserIDsBySubject(ctx, *rule.SubjectID)
				if err != nil {
					return nil, err
				}
				for _, id := range ids {
					addUUID(seen, &result, id)
				}
			} else {
				yearID, err := s.currentAcademicYearID(ctx)
				if err != nil {
					return nil, err
				}
				ids, err := s.repo.ListStudentUserIDsBySubject(ctx, *rule.SubjectID, yearID)
				if err != nil {
					return nil, err
				}
				for _, u := range ids {
					addPgUUID(seen, &result, u)
				}
			}

		case RuleStudent:
			if rule.StudentID == nil {
				continue
			}
			userID, err := s.repo.StudentUserID(ctx, *rule.StudentID)
			if err != nil {
				return nil, err
			}
			addPgUUID(seen, &result, userID)

		case RuleGuardian:
			if rule.GuardianID == nil {
				continue
			}
			userID, err := s.repo.GuardianUserID(ctx, *rule.GuardianID)
			if err != nil {
				return nil, err
			}
			addPgUUID(seen, &result, userID)

		case RuleTeacher:
			if rule.TeacherID == nil {
				continue
			}
			userID, err := s.repo.TeacherUserID(ctx, *rule.TeacherID)
			if err != nil {
				return nil, err
			}
			addUUID(seen, &result, userID)
		}
	}

	return result, nil
}

func (s *NotificationService) materializeRecipients(ctx context.Context, notificationID uuid.UUID, rules []RecipientRule) error {
	userIDs, err := s.resolveRecipientUserIDs(ctx, rules)
	if err != nil {
		return err
	}
	for _, userID := range userIDs {
		if err := s.repo.AddRecipient(ctx, notificationID, userID); err != nil {
			return err
		}
	}
	return nil
}

func validateCategoryAndPriority(category, priority string) error {
	if !ValidCategories[category] {
		return fmt.Errorf("invalid category %q", category)
	}
	if !ValidPriorities[priority] {
		return fmt.Errorf("invalid priority %q", priority)
	}
	return nil
}

// Composer

func (s *NotificationService) Create(ctx context.Context, req CreateNotificationRequest, callerUserID uuid.UUID, callerRole string) (NotificationResponse, error) {
	if err := validateCategoryAndPriority(req.Category, req.Priority); err != nil {
		return NotificationResponse{}, err
	}
	if err := s.authorizeSender(ctx, callerRole, callerUserID, req.RecipientRules); err != nil {
		return NotificationResponse{}, err
	}

	rulesJSON, err := json.Marshal(req.RecipientRules)
	if err != nil {
		return NotificationResponse{}, err
	}

	status := StatusSent
	var sentAt pgtype.Timestamptz
	if req.SaveAsDraft {
		status = StatusDraft
	} else {
		sentAt = pgtype.Timestamptz{Time: time.Now(), Valid: true}
	}

	notification, err := s.repo.Create(ctx, notificationCommand{
		Title: req.Title, Message: req.Message, Category: req.Category, Priority: req.Priority,
		Status: status, RecipientRules: rulesJSON, CreatedBy: callerUserID, SentAt: sentAt,
	})
	if err != nil {
		return NotificationResponse{}, err
	}

	if !req.SaveAsDraft {
		if err := s.materializeRecipients(ctx, notification.ID, req.RecipientRules); err != nil {
			return NotificationResponse{}, err
		}
	}

	return s.toResponse(notification, ""), nil
}

func (s *NotificationService) UpdateDraft(ctx context.Context, id uuid.UUID, req UpdateNotificationRequest, callerUserID uuid.UUID, callerRole string) (NotificationResponse, error) {
	if err := validateCategoryAndPriority(req.Category, req.Priority); err != nil {
		return NotificationResponse{}, err
	}
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return NotificationResponse{}, ErrNotificationNotFound
	}
	if existing.Status != StatusDraft {
		return NotificationResponse{}, ErrNotADraft
	}
	if existing.CreatedBy != callerUserID && callerRole != authz.RoleAdmin {
		return NotificationResponse{}, ErrForbiddenRecipients
	}
	if err := s.authorizeSender(ctx, callerRole, callerUserID, req.RecipientRules); err != nil {
		return NotificationResponse{}, err
	}

	rulesJSON, err := json.Marshal(req.RecipientRules)
	if err != nil {
		return NotificationResponse{}, err
	}

	updated, err := s.repo.UpdateDraft(ctx, notificationCommand{
		ID: id, Title: req.Title, Message: req.Message, Category: req.Category, Priority: req.Priority, RecipientRules: rulesJSON,
	})
	if err != nil {
		return NotificationResponse{}, err
	}
	return s.toResponse(updated, ""), nil
}

func (s *NotificationService) SendDraft(ctx context.Context, id, callerUserID uuid.UUID, callerRole string) (NotificationResponse, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return NotificationResponse{}, ErrNotificationNotFound
	}
	if existing.Status != StatusDraft {
		return NotificationResponse{}, ErrNotADraft
	}
	if existing.CreatedBy != callerUserID && callerRole != authz.RoleAdmin {
		return NotificationResponse{}, ErrForbiddenRecipients
	}

	var rules []RecipientRule
	if err := json.Unmarshal(existing.RecipientRules, &rules); err != nil {
		return NotificationResponse{}, err
	}
	if err := s.authorizeSender(ctx, callerRole, callerUserID, rules); err != nil {
		return NotificationResponse{}, err
	}

	updated, err := s.repo.MarkSent(ctx, id)
	if err != nil {
		return NotificationResponse{}, err
	}
	if err := s.materializeRecipients(ctx, id, rules); err != nil {
		return NotificationResponse{}, err
	}
	return s.toResponse(updated, ""), nil
}

func (s *NotificationService) DeleteDraft(ctx context.Context, id, callerUserID uuid.UUID, callerRole string) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return ErrNotificationNotFound
	}
	if existing.CreatedBy != callerUserID && callerRole != authz.RoleAdmin {
		return ErrForbiddenRecipients
	}
	n, err := s.repo.DeleteDraft(ctx, id)
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotADraft
	}
	return nil
}

func (s *NotificationService) ListSent(ctx context.Context, callerUserID uuid.UUID, callerRole string) ([]NotificationResponse, error) {
	if callerRole == authz.RoleAdmin {
		rows, err := s.repo.ListAllSent(ctx)
		if err != nil {
			return nil, err
		}
		result := make([]NotificationResponse, len(rows))
		for i, row := range rows {
			result[i] = s.toResponse(row.notification, row.SenderName)
		}
		return result, nil
	}

	rows, err := s.repo.ListSentByUser(ctx, callerUserID)
	if err != nil {
		return nil, err
	}
	result := make([]NotificationResponse, len(rows))
	for i, row := range rows {
		result[i] = s.toResponse(row.notification, row.SenderName)
	}
	return result, nil
}

func (s *NotificationService) ListMyDrafts(ctx context.Context, callerUserID uuid.UUID) ([]NotificationResponse, error) {
	rows, err := s.repo.ListMyDrafts(ctx, callerUserID)
	if err != nil {
		return nil, err
	}
	result := make([]NotificationResponse, len(rows))
	for i, row := range rows {
		result[i] = s.toResponse(row, "")
	}
	return result, nil
}

// SendDirect creates and immediately delivers a notification to an explicit list of user IDs, bypassing recipient-rule resolution and sender authorization — for system-triggered notifications (e.g. the timetable workflow) where recipients are already known.
func (s *NotificationService) SendDirect(ctx context.Context, title, message, category, priority string, createdBy uuid.UUID, userIDs []uuid.UUID) error {
	if len(userIDs) == 0 {
		return nil
	}
	if err := validateCategoryAndPriority(category, priority); err != nil {
		return err
	}
	notification, err := s.repo.Create(ctx, notificationCommand{
		Title: title, Message: message, Category: category, Priority: priority,
		Status: StatusSent, RecipientRules: []byte("[]"), CreatedBy: createdBy,
		SentAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
	})
	if err != nil {
		return err
	}
	for _, userID := range userIDs {
		if err := s.repo.AddRecipient(ctx, notification.ID, userID); err != nil {
			return err
		}
	}
	return nil
}

func (s *NotificationService) GetStats(ctx context.Context, id, callerUserID uuid.UUID, callerRole string) (NotificationStatsResponse, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return NotificationStatsResponse{}, ErrNotificationNotFound
	}
	if existing.CreatedBy != callerUserID && callerRole != authz.RoleAdmin {
		return NotificationStatsResponse{}, ErrForbiddenRecipients
	}

	row, err := s.repo.GetStats(ctx, id)
	if err != nil {
		return NotificationStatsResponse{}, err
	}
	return NotificationStatsResponse{Total: row.Total, Read: row.Read, Unread: row.Total - row.Read}, nil
}

func (s *NotificationService) toResponse(n notification, senderName string) NotificationResponse {
	var rules []RecipientRule
	_ = json.Unmarshal(n.RecipientRules, &rules)
	return NotificationResponse{
		ID: n.ID, Title: n.Title, Message: n.Message, Category: n.Category, Priority: n.Priority, Status: n.Status,
		RecipientRules: rules, SenderName: senderName, SentAt: n.SentAt, CreatedAt: n.CreatedAt,
	}
}

// Notification Center (recipient side)

func (s *NotificationService) ListMine(ctx context.Context, userID uuid.UUID) ([]MyNotificationResponse, error) {
	rows, err := s.repo.ListMine(ctx, userID)
	if err != nil {
		return nil, err
	}
	result := make([]MyNotificationResponse, len(rows))
	for i, row := range rows {
		result[i] = MyNotificationResponse(row)
	}
	return result, nil
}

func (s *NotificationService) ListMyArchived(ctx context.Context, userID uuid.UUID) ([]MyNotificationResponse, error) {
	rows, err := s.repo.ListMyArchived(ctx, userID)
	if err != nil {
		return nil, err
	}
	result := make([]MyNotificationResponse, len(rows))
	for i, row := range rows {
		result[i] = MyNotificationResponse(row)
	}
	return result, nil
}

func (s *NotificationService) CountMyUnread(ctx context.Context, userID uuid.UUID) (int64, error) {
	return s.repo.CountMyUnread(ctx, userID)
}

func (s *NotificationService) MarkRead(ctx context.Context, notificationID, userID uuid.UUID) error {
	return s.repo.MarkRead(ctx, notificationID, userID)
}

func (s *NotificationService) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	return s.repo.MarkAllRead(ctx, userID)
}

func (s *NotificationService) SetArchived(ctx context.Context, notificationID, userID uuid.UUID, archived bool) error {
	return s.repo.SetArchived(ctx, notificationID, userID, archived)
}
