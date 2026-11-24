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
	SearchSent(context.Context, HistoryFilter) (HistoryPage, error)
	SearchMine(context.Context, uuid.UUID, InboxFilter) ([]MyNotificationResponse, int64, error)
	CountBoxes(context.Context, uuid.UUID) (InboxCounts, error)
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
	ListStudentUserIDsBySociety(context.Context, uuid.UUID) ([]pgtype.UUID, error)
	ListGuardianUserIDsBySociety(context.Context, uuid.UUID) ([]pgtype.UUID, error)
	IsTeacherInChargeOfSociety(context.Context, uuid.UUID, uuid.UUID) (bool, error)
	ListNotifyClasses(context.Context, uuid.UUID) ([]NotifyClass, error)
	ListNotifySocieties(context.Context, *uuid.UUID) ([]NotifySociety, error)
	ListAllGradeIDs(context.Context) ([]uuid.UUID, error)
	ListGradeSectionIDs(context.Context, uuid.UUID) ([]uuid.UUID, error)
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
		check, ok := senderChecks[rule.Type]
		if !ok {
			return fmt.Errorf("unknown recipient rule type %q", rule.Type)
		}
		if err := check(s, ctx, teacherID, rule); err != nil {
			return err
		}
	}
	return nil
}

type senderCheck func(s *NotificationService, ctx context.Context, teacherID uuid.UUID, rule RecipientRule) error

// senderChecks holds one check per rule type for a teacher sender; a lookup error is treated as forbidden unless noted.
var senderChecks = map[RecipientRuleType]senderCheck{
	RuleEveryone: func(*NotificationService, context.Context, uuid.UUID, RecipientRule) error {
		return ErrForbiddenRecipients
	},
	RuleClass:        (*NotificationService).checkClassRule,
	RuleGrade:        (*NotificationService).checkGradeRule,
	RuleGradeSection: (*NotificationService).checkGradeRule,
	RuleSubject:      (*NotificationService).checkSubjectRule,
	RuleStudent:      (*NotificationService).checkStudentRule,
	RuleGuardian:     (*NotificationService).checkGuardianRule,
	// Colleague-to-colleague messaging is low-risk; any teacher may do it.
	RuleTeacher: func(*NotificationService, context.Context, uuid.UUID, RecipientRule) error { return nil },
	RuleSociety: (*NotificationService).checkSocietyRule,
}

// allowed turns a yes/no lookup into nil or ErrForbiddenRecipients.
func allowed(ok bool, err error) error {
	if err != nil || !ok {
		return ErrForbiddenRecipients
	}
	return nil
}

func (s *NotificationService) checkClassRule(ctx context.Context, teacherID uuid.UUID, rule RecipientRule) error {
	if rule.ClassID == nil || !validAudience(rule.Audience) {
		return ErrForbiddenRecipients
	}
	return allowed(s.repo.IsTeacherAssignedToClass(ctx, *rule.ClassID, teacherID))
}

// checkGradeRule requires the teacher to head every grade the rule covers; lookup errors are returned as is.
func (s *NotificationService) checkGradeRule(ctx context.Context, teacherID uuid.UUID, rule RecipientRule) error {
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
	return nil
}

// checkSubjectRule lets a grade-heading subject teacher reach that subject's students, but not its other teachers.
func (s *NotificationService) checkSubjectRule(ctx context.Context, teacherID uuid.UUID, rule RecipientRule) error {
	if rule.SubjectID == nil || rule.SubjectAudience != AudienceStudents {
		return ErrForbiddenRecipients
	}
	// A subject rule reaches the subject's students across the school, so only grade or section heads may use it.
	grades, err := s.authorizedGradeIDs(ctx, teacherID)
	if err != nil || len(grades) == 0 {
		return ErrForbiddenRecipients
	}
	return allowed(s.repo.IsTeacherAssignedToSubject(ctx, teacherID, *rule.SubjectID))
}

func (s *NotificationService) checkStudentRule(ctx context.Context, teacherID uuid.UUID, rule RecipientRule) error {
	if rule.StudentID == nil {
		return ErrForbiddenRecipients
	}
	classID, err := s.repo.StudentCurrentClass(ctx, *rule.StudentID)
	if err != nil {
		return ErrForbiddenRecipients
	}
	return allowed(s.repo.IsTeacherAssignedToClass(ctx, classID, teacherID))
}

func (s *NotificationService) checkGuardianRule(ctx context.Context, teacherID uuid.UUID, rule RecipientRule) error {
	if rule.GuardianID == nil {
		return ErrForbiddenRecipients
	}
	studentIDs, err := s.repo.ListStudentIDsByGuardian(ctx, *rule.GuardianID)
	if err != nil {
		return err
	}
	return allowed(s.repo.IsTeacherAssignedToAnyStudentClass(ctx, studentIDs, teacherID))
}

// recipientSet collects user ids once each, in the order first seen.
type recipientSet struct {
	seen map[uuid.UUID]bool
	ids  []uuid.UUID
}

func (r *recipientSet) add(ids ...uuid.UUID) {
	for _, id := range ids {
		addUUID(r.seen, &r.ids, id)
	}
}

func (r *recipientSet) addPg(ids ...pgtype.UUID) {
	for _, id := range ids {
		addPgUUID(r.seen, &r.ids, id)
	}
}

// resolveRecipientUserIDs expands the rule set into the deduplicated set
// of users.id that should receive the notification.
func (s *NotificationService) resolveRecipientUserIDs(ctx context.Context, rules []RecipientRule) ([]uuid.UUID, error) {
	set := &recipientSet{seen: map[uuid.UUID]bool{}}
	for _, rule := range rules {
		resolve, ok := recipientResolvers[rule.Type]
		if !ok {
			continue
		}
		if err := resolve(s, ctx, rule, set); err != nil {
			return nil, err
		}
	}
	return set.ids, nil
}

type recipientResolver func(s *NotificationService, ctx context.Context, rule RecipientRule, set *recipientSet) error

// recipientResolvers holds one resolver per rule type; a rule missing its id adds no one.
var recipientResolvers = map[RecipientRuleType]recipientResolver{
	RuleEveryone: func(s *NotificationService, ctx context.Context, _ RecipientRule, set *recipientSet) error {
		ids, err := s.repo.ListAllUserIDs(ctx)
		set.add(ids...)
		return err
	},
	RuleClass: func(s *NotificationService, ctx context.Context, rule RecipientRule, set *recipientSet) error {
		if rule.ClassID == nil {
			return nil
		}
		return s.addClassAudience(ctx, *rule.ClassID, rule.Audience, set)
	},
	RuleSociety:      (*NotificationService).addSociety,
	RuleGrade:        (*NotificationService).addGrades,
	RuleGradeSection: (*NotificationService).addGrades,
	RuleSubject:      (*NotificationService).addSubject,
	RuleStudent: func(s *NotificationService, ctx context.Context, rule RecipientRule, set *recipientSet) error {
		if rule.StudentID == nil {
			return nil
		}
		id, err := s.repo.StudentUserID(ctx, *rule.StudentID)
		if err != nil {
			return err
		}
		set.addPg(id)
		return nil
	},
	RuleGuardian: func(s *NotificationService, ctx context.Context, rule RecipientRule, set *recipientSet) error {
		if rule.GuardianID == nil {
			return nil
		}
		id, err := s.repo.GuardianUserID(ctx, *rule.GuardianID)
		if err != nil {
			return err
		}
		set.addPg(id)
		return nil
	},
	RuleTeacher: func(s *NotificationService, ctx context.Context, rule RecipientRule, set *recipientSet) error {
		if rule.TeacherID == nil {
			return nil
		}
		id, err := s.repo.TeacherUserID(ctx, *rule.TeacherID)
		if err != nil {
			return err
		}
		set.add(id)
		return nil
	},
}

// addClass adds the class's students, their guardians and its teachers.
func (s *NotificationService) addClass(ctx context.Context, classID uuid.UUID, set *recipientSet) error {
	students, err := s.repo.ListStudentUserIDsByClass(ctx, classID)
	if err != nil {
		return err
	}
	set.addPg(students...)
	guardians, err := s.repo.ListGuardianUserIDsByClass(ctx, classID)
	if err != nil {
		return err
	}
	set.addPg(guardians...)
	teachers, err := s.repo.ListTeacherUserIDsByClass(ctx, classID)
	if err != nil {
		return err
	}
	set.add(teachers...)
	return nil
}

// addGrades adds every class of each grade the rule covers in the current year.
func (s *NotificationService) addGrades(ctx context.Context, rule RecipientRule, set *recipientSet) error {
	gradeIDs, err := s.gradesForRule(ctx, rule)
	if err != nil {
		return err
	}
	for _, gradeID := range gradeIDs {
		yearID, err := s.currentAcademicYearID(ctx)
		if err != nil {
			return err
		}
		classIDs, err := s.repo.ListClassIDsByGrade(ctx, gradeID, yearID)
		if err != nil {
			return err
		}
		for _, classID := range classIDs {
			if err := s.addClass(ctx, classID, set); err != nil {
				return err
			}
		}
	}
	return nil
}

// addSubject adds the subject's teachers, or its students in the current year.
func (s *NotificationService) addSubject(ctx context.Context, rule RecipientRule, set *recipientSet) error {
	if rule.SubjectID == nil {
		return nil
	}
	if rule.SubjectAudience == AudienceTeachers {
		ids, err := s.repo.ListTeacherUserIDsBySubject(ctx, *rule.SubjectID)
		if err != nil {
			return err
		}
		set.add(ids...)
		return nil
	}
	yearID, err := s.currentAcademicYearID(ctx)
	if err != nil {
		return err
	}
	ids, err := s.repo.ListStudentUserIDsBySubject(ctx, *rule.SubjectID, yearID)
	if err != nil {
		return err
	}
	set.addPg(ids...)
	return nil
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

var ErrInvalidBox = errors.New("box must be unread, read or archived")

// History pages sent notifications; a teacher only ever sees their own, an admin sees the whole school.
func (s *NotificationService) History(ctx context.Context, callerUserID uuid.UUID, callerRole string, filter HistoryFilter) (HistoryPage, error) {
	if callerRole != authz.RoleAdmin {
		filter.SenderID = &callerUserID
	}
	return s.repo.SearchSent(ctx, filter)
}

// Inbox pages one box of the caller's notifications, with counts for every box.
func (s *NotificationService) Inbox(ctx context.Context, userID uuid.UUID, filter InboxFilter) (InboxPage, error) {
	if !validBoxes[filter.Box] {
		return InboxPage{}, ErrInvalidBox
	}
	items, total, err := s.repo.SearchMine(ctx, userID, filter)
	if err != nil {
		return InboxPage{}, err
	}
	counts, err := s.repo.CountBoxes(ctx, userID)
	if err != nil {
		return InboxPage{}, err
	}
	return InboxPage{Items: items, Total: total, Limit: filter.Limit, Offset: filter.Offset, Counts: counts}, nil
}
