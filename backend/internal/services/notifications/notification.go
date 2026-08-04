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
	db "github.com/openschool-org/openschool/db/sqlc"
	models "github.com/openschool-org/openschool/internal/models/notifications"
	rootrepositories "github.com/openschool-org/openschool/internal/repositories"
	repositories "github.com/openschool-org/openschool/internal/repositories/notifications"
	timetablerepositories "github.com/openschool-org/openschool/internal/repositories/timetable"
)

var (
	ErrNotificationNotFound = errors.New("notification not found")
	ErrForbiddenRecipients  = errors.New("you are not authorized to notify one or more of the selected recipients")
	ErrNotADraft            = errors.New("this action only applies to draft notifications")
)

type NotificationService struct {
	repo             *repositories.NotificationRepository
	classRepo        *rootrepositories.ClassRepository
	gradeSectionRepo *timetablerepositories.GradeSectionRepository
	sectionHeadRepo  *rootrepositories.SectionHeadRepository
	teacherRepo      *rootrepositories.TeacherRepository
	studentRepo      *rootrepositories.StudentRepository
	guardianRepo     *rootrepositories.GuardianRepository
	schoolRepo       *rootrepositories.SchoolRepository
	positionRepo     *rootrepositories.PositionRepository
}

func NewNotificationService(
	repo *repositories.NotificationRepository,
	classRepo *rootrepositories.ClassRepository,
	gradeSectionRepo *timetablerepositories.GradeSectionRepository,
	sectionHeadRepo *rootrepositories.SectionHeadRepository,
	teacherRepo *rootrepositories.TeacherRepository,
	studentRepo *rootrepositories.StudentRepository,
	guardianRepo *rootrepositories.GuardianRepository,
	schoolRepo *rootrepositories.SchoolRepository,
	positionRepo *rootrepositories.PositionRepository,
) *NotificationService {
	return &NotificationService{
		repo: repo, classRepo: classRepo, gradeSectionRepo: gradeSectionRepo, sectionHeadRepo: sectionHeadRepo,
		teacherRepo: teacherRepo, studentRepo: studentRepo, guardianRepo: guardianRepo, schoolRepo: schoolRepo,
		positionRepo: positionRepo,
	}
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
	year, err := s.schoolRepo.GetCurrentAcademicYear(ctx)
	if err != nil {
		return uuid.UUID{}, fmt.Errorf("no current academic year configured")
	}
	return year.ID, nil
}

// gradesForRule expands a grade/grade_section rule into the concrete
// grade IDs it covers.
func (s *NotificationService) gradesForRule(ctx context.Context, rule models.RecipientRule) ([]uuid.UUID, error) {
	switch rule.Type {
	case models.RuleGrade:
		if rule.GradeID == nil {
			return nil, nil
		}
		return []uuid.UUID{*rule.GradeID}, nil
	case models.RuleGradeSection:
		if rule.GradeSectionID == nil {
			return nil, nil
		}
		grades, err := s.gradeSectionRepo.ListGrades(ctx, *rule.GradeSectionID)
		if err != nil {
			return nil, err
		}
		ids := make([]uuid.UUID, len(grades))
		for i, g := range grades {
			ids[i] = g.ID
		}
		return ids, nil
	default:
		return nil, nil
	}
}

// isTeacherAuthorizedForGrade mirrors the section-head resolution used to
// gate timetable review: either the grade's per-grade TIC or its
// grade_sections group head may notify that grade's members.
func (s *NotificationService) isTeacherAuthorizedForGrade(ctx context.Context, teacherID, gradeID uuid.UUID) (bool, error) {
	yearID, err := s.currentAcademicYearID(ctx)
	if err != nil {
		return false, err
	}
	if tic, err := s.sectionHeadRepo.GetGradeTIC(ctx, yearID, gradeID); err == nil && tic == teacherID {
		return true, nil
	} else if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return false, err
	}
	section, err := s.gradeSectionRepo.GetForGrade(ctx, yearID, gradeID)
	if err == nil && section.SectionHeadTeacherID.Valid && uuid.UUID(section.SectionHeadTeacherID.Bytes) == teacherID {
		return true, nil
	} else if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return false, err
	}
	if authorized, err := s.positionRepo.IsVicePrincipalAuthorizedForGrade(ctx, teacherID, gradeID); err != nil {
		return false, err
	} else if authorized {
		return true, nil
	}
	return false, nil
}

// authorizeSender enforces that a non-admin sender only targets audiences
// they're actually responsible for: their own classes (form or subject
// teacher), grades/grade-sections they head, subjects they teach, and the
// students/guardians that fall under those. Admins may target anything.
func (s *NotificationService) authorizeSender(ctx context.Context, callerRole string, callerUserID uuid.UUID, rules []models.RecipientRule) error {
	if callerRole == "admin" {
		return nil
	}
	if callerRole != "teacher" {
		return ErrForbiddenRecipients
	}
	teacher, err := s.teacherRepo.GetByUserID(ctx, callerUserID)
	if err != nil {
		return fmt.Errorf("no teacher profile linked to this account")
	}

	// Principal has the same reach as admin, including RuleEveryone. This is
	// a permanent appointment, not scoped to an academic year.
	if isPrincipal, err := s.positionRepo.IsPrincipal(ctx, teacher.ID); err != nil {
		return err
	} else if isPrincipal {
		return nil
	}

	for _, rule := range rules {
		switch rule.Type {
		case models.RuleEveryone:
			return ErrForbiddenRecipients

		case models.RuleClass:
			if rule.ClassID == nil {
				return ErrForbiddenRecipients
			}
			ok, err := s.classRepo.IsTeacherAssignedToClass(ctx, *rule.ClassID, teacher.ID)
			if err != nil || !ok {
				return ErrForbiddenRecipients
			}

		case models.RuleGrade, models.RuleGradeSection:
			gradeIDs, err := s.gradesForRule(ctx, rule)
			if err != nil {
				return err
			}
			if len(gradeIDs) == 0 {
				return ErrForbiddenRecipients
			}
			for _, gradeID := range gradeIDs {
				ok, err := s.isTeacherAuthorizedForGrade(ctx, teacher.ID, gradeID)
				if err != nil {
					return err
				}
				if !ok {
					return ErrForbiddenRecipients
				}
			}

		case models.RuleSubject:
			if rule.SubjectID == nil || rule.SubjectAudience != models.AudienceStudents {
				return ErrForbiddenRecipients
			}
			ok, err := s.repo.IsTeacherAssignedToSubject(ctx, teacher.ID, *rule.SubjectID)
			if err != nil || !ok {
				return ErrForbiddenRecipients
			}

		case models.RuleStudent:
			if rule.StudentID == nil {
				return ErrForbiddenRecipients
			}
			class, err := s.classRepo.GetStudentCurrentClass(ctx, *rule.StudentID)
			if err != nil {
				return ErrForbiddenRecipients
			}
			ok, err := s.classRepo.IsTeacherAssignedToClass(ctx, class.ID, teacher.ID)
			if err != nil || !ok {
				return ErrForbiddenRecipients
			}

		case models.RuleGuardian:
			if rule.GuardianID == nil {
				return ErrForbiddenRecipients
			}
			studentIDs, err := s.repo.ListStudentIDsByGuardian(ctx, *rule.GuardianID)
			if err != nil {
				return err
			}
			authorized := false
			for _, studentID := range studentIDs {
				class, err := s.classRepo.GetStudentCurrentClass(ctx, studentID)
				if err != nil {
					continue
				}
				if ok, err := s.classRepo.IsTeacherAssignedToClass(ctx, class.ID, teacher.ID); err == nil && ok {
					authorized = true
					break
				}
			}
			if !authorized {
				return ErrForbiddenRecipients
			}

		case models.RuleTeacher:
			// colleague-to-colleague messaging is low-risk; any teacher may do it

		default:
			return fmt.Errorf("unknown recipient rule type %q", rule.Type)
		}
	}
	return nil
}

// resolveRecipientUserIDs expands the rule set into the deduplicated set
// of users.id that should receive the notification.
func (s *NotificationService) resolveRecipientUserIDs(ctx context.Context, rules []models.RecipientRule) ([]uuid.UUID, error) {
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
		case models.RuleEveryone:
			ids, err := s.repo.ListAllUserIDs(ctx)
			if err != nil {
				return nil, err
			}
			for _, id := range ids {
				addUUID(seen, &result, id)
			}

		case models.RuleClass:
			if rule.ClassID == nil {
				continue
			}
			if err := resolveClass(*rule.ClassID); err != nil {
				return nil, err
			}

		case models.RuleGrade:
			if rule.GradeID == nil {
				continue
			}
			if err := resolveGrade(*rule.GradeID); err != nil {
				return nil, err
			}

		case models.RuleGradeSection:
			gradeIDs, err := s.gradesForRule(ctx, rule)
			if err != nil {
				return nil, err
			}
			for _, gradeID := range gradeIDs {
				if err := resolveGrade(gradeID); err != nil {
					return nil, err
				}
			}

		case models.RuleSubject:
			if rule.SubjectID == nil {
				continue
			}
			if rule.SubjectAudience == models.AudienceTeachers {
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

		case models.RuleStudent:
			if rule.StudentID == nil {
				continue
			}
			student, err := s.studentRepo.GetByID(ctx, *rule.StudentID)
			if err != nil {
				return nil, err
			}
			addPgUUID(seen, &result, student.UserID)

		case models.RuleGuardian:
			if rule.GuardianID == nil {
				continue
			}
			guardian, err := s.guardianRepo.GetByID(ctx, *rule.GuardianID)
			if err != nil {
				return nil, err
			}
			addPgUUID(seen, &result, guardian.UserID)

		case models.RuleTeacher:
			if rule.TeacherID == nil {
				continue
			}
			teacher, err := s.teacherRepo.GetByID(ctx, *rule.TeacherID)
			if err != nil {
				return nil, err
			}
			addUUID(seen, &result, teacher.UserID)
		}
	}

	return result, nil
}

func (s *NotificationService) materializeRecipients(ctx context.Context, notificationID uuid.UUID, rules []models.RecipientRule) error {
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
	if !models.ValidCategories[category] {
		return fmt.Errorf("invalid category %q", category)
	}
	if !models.ValidPriorities[priority] {
		return fmt.Errorf("invalid priority %q", priority)
	}
	return nil
}

// Composer

func (s *NotificationService) Create(ctx context.Context, req models.CreateNotificationRequest, callerUserID uuid.UUID, callerRole string) (models.NotificationResponse, error) {
	if err := validateCategoryAndPriority(req.Category, req.Priority); err != nil {
		return models.NotificationResponse{}, err
	}
	if err := s.authorizeSender(ctx, callerRole, callerUserID, req.RecipientRules); err != nil {
		return models.NotificationResponse{}, err
	}

	rulesJSON, err := json.Marshal(req.RecipientRules)
	if err != nil {
		return models.NotificationResponse{}, err
	}

	status := "sent"
	var sentAt pgtype.Timestamptz
	if req.SaveAsDraft {
		status = "draft"
	} else {
		sentAt = pgtype.Timestamptz{Time: time.Now(), Valid: true}
	}

	notification, err := s.repo.Create(ctx, db.CreateNotificationParams{
		Title: req.Title, Message: req.Message, Category: req.Category, Priority: req.Priority,
		Status: status, RecipientRules: rulesJSON, CreatedBy: callerUserID, SentAt: sentAt,
	})
	if err != nil {
		return models.NotificationResponse{}, err
	}

	if !req.SaveAsDraft {
		if err := s.materializeRecipients(ctx, notification.ID, req.RecipientRules); err != nil {
			return models.NotificationResponse{}, err
		}
	}

	return s.toResponse(notification, ""), nil
}

func (s *NotificationService) UpdateDraft(ctx context.Context, id uuid.UUID, req models.UpdateNotificationRequest, callerUserID uuid.UUID, callerRole string) (models.NotificationResponse, error) {
	if err := validateCategoryAndPriority(req.Category, req.Priority); err != nil {
		return models.NotificationResponse{}, err
	}
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return models.NotificationResponse{}, ErrNotificationNotFound
	}
	if existing.Status != "draft" {
		return models.NotificationResponse{}, ErrNotADraft
	}
	if existing.CreatedBy != callerUserID && callerRole != "admin" {
		return models.NotificationResponse{}, ErrForbiddenRecipients
	}
	if err := s.authorizeSender(ctx, callerRole, callerUserID, req.RecipientRules); err != nil {
		return models.NotificationResponse{}, err
	}

	rulesJSON, err := json.Marshal(req.RecipientRules)
	if err != nil {
		return models.NotificationResponse{}, err
	}

	updated, err := s.repo.UpdateDraft(ctx, db.UpdateNotificationDraftParams{
		ID: id, Title: req.Title, Message: req.Message, Category: req.Category, Priority: req.Priority, RecipientRules: rulesJSON,
	})
	if err != nil {
		return models.NotificationResponse{}, err
	}
	return s.toResponse(updated, ""), nil
}

func (s *NotificationService) SendDraft(ctx context.Context, id, callerUserID uuid.UUID, callerRole string) (models.NotificationResponse, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return models.NotificationResponse{}, ErrNotificationNotFound
	}
	if existing.Status != "draft" {
		return models.NotificationResponse{}, ErrNotADraft
	}
	if existing.CreatedBy != callerUserID && callerRole != "admin" {
		return models.NotificationResponse{}, ErrForbiddenRecipients
	}

	var rules []models.RecipientRule
	if err := json.Unmarshal(existing.RecipientRules, &rules); err != nil {
		return models.NotificationResponse{}, err
	}
	if err := s.authorizeSender(ctx, callerRole, callerUserID, rules); err != nil {
		return models.NotificationResponse{}, err
	}

	updated, err := s.repo.MarkSent(ctx, id)
	if err != nil {
		return models.NotificationResponse{}, err
	}
	if err := s.materializeRecipients(ctx, id, rules); err != nil {
		return models.NotificationResponse{}, err
	}
	return s.toResponse(updated, ""), nil
}

func (s *NotificationService) DeleteDraft(ctx context.Context, id, callerUserID uuid.UUID, callerRole string) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return ErrNotificationNotFound
	}
	if existing.CreatedBy != callerUserID && callerRole != "admin" {
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

func (s *NotificationService) ListSent(ctx context.Context, callerUserID uuid.UUID, callerRole string) ([]models.NotificationResponse, error) {
	if callerRole == "admin" {
		rows, err := s.repo.ListAllSent(ctx)
		if err != nil {
			return nil, err
		}
		result := make([]models.NotificationResponse, len(rows))
		for i, row := range rows {
			result[i] = s.toResponse(db.Notification{
				ID: row.ID, Title: row.Title, Message: row.Message, Category: row.Category, Priority: row.Priority,
				Status: row.Status, RecipientRules: row.RecipientRules, CreatedBy: row.CreatedBy, SentAt: row.SentAt,
				CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
			}, row.SenderName)
		}
		return result, nil
	}

	rows, err := s.repo.ListSentByUser(ctx, callerUserID)
	if err != nil {
		return nil, err
	}
	result := make([]models.NotificationResponse, len(rows))
	for i, row := range rows {
		result[i] = s.toResponse(db.Notification{
			ID: row.ID, Title: row.Title, Message: row.Message, Category: row.Category, Priority: row.Priority,
			Status: row.Status, RecipientRules: row.RecipientRules, CreatedBy: row.CreatedBy, SentAt: row.SentAt,
			CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
		}, row.SenderName)
	}
	return result, nil
}

func (s *NotificationService) ListMyDrafts(ctx context.Context, callerUserID uuid.UUID) ([]models.NotificationResponse, error) {
	rows, err := s.repo.ListMyDrafts(ctx, callerUserID)
	if err != nil {
		return nil, err
	}
	result := make([]models.NotificationResponse, len(rows))
	for i, row := range rows {
		result[i] = s.toResponse(row, "")
	}
	return result, nil
}

// SendDirect creates and immediately delivers a notification to an
// explicit list of user IDs, bypassing recipient-rule resolution and
// sender authorization. Used by system-triggered notifications (e.g. the
// timetable workflow) where the exact recipients are already known and
// there's no end-user "composing" the message.
func (s *NotificationService) SendDirect(ctx context.Context, title, message, category, priority string, createdBy uuid.UUID, userIDs []uuid.UUID) error {
	if len(userIDs) == 0 {
		return nil
	}
	if err := validateCategoryAndPriority(category, priority); err != nil {
		return err
	}
	notification, err := s.repo.Create(ctx, db.CreateNotificationParams{
		Title: title, Message: message, Category: category, Priority: priority,
		Status: "sent", RecipientRules: []byte("[]"), CreatedBy: createdBy,
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

func (s *NotificationService) GetStats(ctx context.Context, id uuid.UUID) (models.NotificationStatsResponse, error) {
	row, err := s.repo.GetStats(ctx, id)
	if err != nil {
		return models.NotificationStatsResponse{}, err
	}
	return models.NotificationStatsResponse{Total: row.Total, Read: row.ReadCount, Unread: row.Total - row.ReadCount}, nil
}

func (s *NotificationService) toResponse(n db.Notification, senderName string) models.NotificationResponse {
	var rules []models.RecipientRule
	_ = json.Unmarshal(n.RecipientRules, &rules)
	return models.NotificationResponse{
		ID: n.ID, Title: n.Title, Message: n.Message, Category: n.Category, Priority: n.Priority, Status: n.Status,
		RecipientRules: rules, SenderName: senderName, SentAt: n.SentAt, CreatedAt: n.CreatedAt,
	}
}

// Notification Center (recipient side)

func (s *NotificationService) ListMine(ctx context.Context, userID uuid.UUID) ([]models.MyNotificationResponse, error) {
	rows, err := s.repo.ListMine(ctx, userID)
	if err != nil {
		return nil, err
	}
	result := make([]models.MyNotificationResponse, len(rows))
	for i, row := range rows {
		result[i] = models.MyNotificationResponse{
			RecipientID: row.RecipientID, NotificationID: row.NotificationID, Title: row.Title, Message: row.Message,
			Category: row.Category, Priority: row.Priority, SenderName: row.SenderName, SentAt: row.SentAt,
			IsRead: row.IsRead, IsArchived: row.IsArchived,
		}
	}
	return result, nil
}

func (s *NotificationService) ListMyArchived(ctx context.Context, userID uuid.UUID) ([]models.MyNotificationResponse, error) {
	rows, err := s.repo.ListMyArchived(ctx, userID)
	if err != nil {
		return nil, err
	}
	result := make([]models.MyNotificationResponse, len(rows))
	for i, row := range rows {
		result[i] = models.MyNotificationResponse{
			RecipientID: row.RecipientID, NotificationID: row.NotificationID, Title: row.Title, Message: row.Message,
			Category: row.Category, Priority: row.Priority, SenderName: row.SenderName, SentAt: row.SentAt,
			IsRead: row.IsRead, IsArchived: row.IsArchived,
		}
	}
	return result, nil
}

func (s *NotificationService) CountMyUnread(ctx context.Context, userID uuid.UUID) (int64, error) {
	return s.repo.CountMyUnread(ctx, userID)
}

func (s *NotificationService) MarkRead(ctx context.Context, notificationID, userID uuid.UUID) error {
	return s.repo.MarkRead(ctx, notificationID, userID)
}

func (s *NotificationService) SetArchived(ctx context.Context, notificationID, userID uuid.UUID, archived bool) error {
	return s.repo.SetArchived(ctx, notificationID, userID, archived)
}
