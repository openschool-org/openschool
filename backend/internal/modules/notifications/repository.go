package notifications

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type NotificationRepository struct {
	queries *db.Queries
}

func NewNotificationRepository(pool *pgxpool.Pool) *NotificationRepository {
	return &NotificationRepository{queries: db.New(pool)}
}

func (r *NotificationRepository) Create(ctx context.Context, command notificationCommand) (notification, error) {
	row, err := r.queries.CreateNotification(ctx, db.CreateNotificationParams{Title: command.Title, Message: command.Message, Category: command.Category, Priority: command.Priority, Status: command.Status, RecipientRules: command.RecipientRules, CreatedBy: command.CreatedBy, SentAt: command.SentAt})
	return mapNotification(row), err
}

func (r *NotificationRepository) UpdateDraft(ctx context.Context, command notificationCommand) (notification, error) {
	row, err := r.queries.UpdateNotificationDraft(ctx, db.UpdateNotificationDraftParams{ID: command.ID, Title: command.Title, Message: command.Message, Category: command.Category, Priority: command.Priority, RecipientRules: command.RecipientRules})
	return mapNotification(row), err
}

func (r *NotificationRepository) MarkSent(ctx context.Context, id uuid.UUID) (notification, error) {
	row, err := r.queries.MarkNotificationSent(ctx, id)
	return mapNotification(row), err
}

func (r *NotificationRepository) GetByID(ctx context.Context, id uuid.UUID) (notification, error) {
	row, err := r.queries.GetNotificationByID(ctx, id)
	return mapNotification(row), err
}

func (r *NotificationRepository) DeleteDraft(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteDraftNotification(ctx, id)
}

func (r *NotificationRepository) ListSentByUser(ctx context.Context, userID uuid.UUID) ([]sentNotification, error) {
	rows, err := r.queries.ListSentNotificationsByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]sentNotification, len(rows))
	for i, row := range rows {
		out[i] = sentNotification{notification: notificationFromSent(row.ID, row.Title, row.Message, row.Category, row.Priority, row.Status, row.RecipientRules, row.CreatedBy, row.SentAt, row.CreatedAt, row.UpdatedAt), SenderName: row.SenderName}
	}
	return out, nil
}

func (r *NotificationRepository) ListAllSent(ctx context.Context) ([]sentNotification, error) {
	rows, err := r.queries.ListAllSentNotifications(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]sentNotification, len(rows))
	for i, row := range rows {
		out[i] = sentNotification{notification: notificationFromSent(row.ID, row.Title, row.Message, row.Category, row.Priority, row.Status, row.RecipientRules, row.CreatedBy, row.SentAt, row.CreatedAt, row.UpdatedAt), SenderName: row.SenderName}
	}
	return out, nil
}

func (r *NotificationRepository) ListMyDrafts(ctx context.Context, userID uuid.UUID) ([]notification, error) {
	rows, err := r.queries.ListMyDraftNotifications(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]notification, len(rows))
	for i, row := range rows {
		out[i] = mapNotification(row)
	}
	return out, nil
}

func (r *NotificationRepository) GetStats(ctx context.Context, id uuid.UUID) (recipientStats, error) {
	row, err := r.queries.GetNotificationRecipientStats(ctx, id)
	return recipientStats{Total: row.Total, Read: row.ReadCount}, err
}

// Recipients (notification center)

func (r *NotificationRepository) AddRecipient(ctx context.Context, notificationID, userID uuid.UUID) error {
	return r.queries.CreateNotificationRecipient(ctx, db.CreateNotificationRecipientParams{NotificationID: notificationID, UserID: userID})
}

func (r *NotificationRepository) ListMine(ctx context.Context, userID uuid.UUID) ([]recipientNotification, error) {
	rows, err := r.queries.ListMyNotifications(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]recipientNotification, len(rows))
	for i, row := range rows {
		out[i] = recipientNotification{RecipientID: row.RecipientID, NotificationID: row.NotificationID, Title: row.Title, Message: row.Message, Category: row.Category, Priority: row.Priority, SenderName: row.SenderName, SentAt: row.SentAt, IsRead: row.IsRead, IsArchived: row.IsArchived}
	}
	return out, nil
}

func (r *NotificationRepository) ListMyArchived(ctx context.Context, userID uuid.UUID) ([]recipientNotification, error) {
	rows, err := r.queries.ListMyArchivedNotifications(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]recipientNotification, len(rows))
	for i, row := range rows {
		out[i] = recipientNotification{RecipientID: row.RecipientID, NotificationID: row.NotificationID, Title: row.Title, Message: row.Message, Category: row.Category, Priority: row.Priority, SenderName: row.SenderName, SentAt: row.SentAt, IsRead: row.IsRead, IsArchived: row.IsArchived}
	}
	return out, nil
}

func (r *NotificationRepository) CountMyUnread(ctx context.Context, userID uuid.UUID) (int64, error) {
	return r.queries.CountMyUnreadNotifications(ctx, userID)
}

func (r *NotificationRepository) MarkRead(ctx context.Context, notificationID, userID uuid.UUID) error {
	return r.queries.MarkNotificationRecipientRead(ctx, db.MarkNotificationRecipientReadParams{NotificationID: notificationID, UserID: userID})
}

func (r *NotificationRepository) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	return r.queries.MarkAllNotificationRecipientsRead(ctx, userID)
}

func (r *NotificationRepository) SetArchived(ctx context.Context, notificationID, userID uuid.UUID, archived bool) error {
	return r.queries.SetNotificationRecipientArchived(ctx, db.SetNotificationRecipientArchivedParams{NotificationID: notificationID, UserID: userID, IsArchived: archived})
}

// Recipient resolution

func (r *NotificationRepository) ListAllUserIDs(ctx context.Context) ([]uuid.UUID, error) {
	return r.queries.ListAllUserIDs(ctx)
}

func (r *NotificationRepository) ListStudentUserIDsByClass(ctx context.Context, classID uuid.UUID) ([]pgtype.UUID, error) {
	return r.queries.ListStudentUserIDsByClass(ctx, classID)
}

func (r *NotificationRepository) ListGuardianUserIDsByClass(ctx context.Context, classID uuid.UUID) ([]pgtype.UUID, error) {
	return r.queries.ListGuardianUserIDsByClass(ctx, classID)
}

func (r *NotificationRepository) ListTeacherUserIDsByClass(ctx context.Context, classID uuid.UUID) ([]uuid.UUID, error) {
	return r.queries.ListTeacherUserIDsByClass(ctx, classID)
}

func (r *NotificationRepository) ListClassIDsByGrade(ctx context.Context, gradeID, academicYearID uuid.UUID) ([]uuid.UUID, error) {
	return r.queries.ListClassIDsByGrade(ctx, db.ListClassIDsByGradeParams{GradeID: gradeID, AcademicYearID: academicYearID})
}

func (r *NotificationRepository) ListTeacherUserIDsBySubject(ctx context.Context, subjectID uuid.UUID) ([]uuid.UUID, error) {
	return r.queries.ListTeacherUserIDsBySubject(ctx, subjectID)
}

func (r *NotificationRepository) ListStudentUserIDsBySubject(ctx context.Context, subjectID, academicYearID uuid.UUID) ([]pgtype.UUID, error) {
	return r.queries.ListStudentUserIDsBySubject(ctx, db.ListStudentUserIDsBySubjectParams{SubjectID: subjectID, AcademicYearID: academicYearID})
}

func (r *NotificationRepository) ListStudentIDsByGuardian(ctx context.Context, guardianID uuid.UUID) ([]uuid.UUID, error) {
	return r.queries.ListStudentIDsByGuardian(ctx, guardianID)
}

// IsTeacherAssignedToSubject reuses the query generated for the timetable module's validator — sqlc queries share one flat db.Queries type across the whole app regardless of which package registered them.
func (r *NotificationRepository) IsTeacherAssignedToSubject(ctx context.Context, teacherID, subjectID uuid.UUID) (bool, error) {
	return r.queries.IsTeacherAssignedToSubject(ctx, db.IsTeacherAssignedToSubjectParams{TeacherID: teacherID, SubjectID: subjectID})
}

func (r *NotificationRepository) CurrentAcademicYearID(ctx context.Context) (uuid.UUID, error) {
	row, err := r.queries.GetCurrentAcademicYear(ctx)
	return row.ID, err
}
func (r *NotificationRepository) ListGradeIDs(ctx context.Context, sectionID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.queries.ListGradesBySection(ctx, sectionID)
	if err != nil {
		return nil, err
	}
	out := make([]uuid.UUID, len(rows))
	for i, row := range rows {
		out[i] = row.ID
	}
	return out, nil
}
func (r *NotificationRepository) GetGradeTIC(ctx context.Context, yearID, gradeID uuid.UUID) (uuid.UUID, error) {
	return r.queries.GetGradeTICForGrade(ctx, db.GetGradeTICForGradeParams{AcademicYearID: yearID, GradeID: gradeID})
}
func (r *NotificationRepository) GetGradeSectionHead(ctx context.Context, yearID, gradeID uuid.UUID) (pgtype.UUID, error) {
	row, err := r.queries.GetGradeSectionForGrade(ctx, db.GetGradeSectionForGradeParams{AcademicYearID: yearID, GradeID: gradeID})
	return row.SectionHeadTeacherID, err
}
func (r *NotificationRepository) IsVicePrincipalAuthorizedForGrade(ctx context.Context, teacherID, gradeID uuid.UUID) (bool, error) {
	return r.queries.IsVicePrincipalAuthorizedForGrade(ctx, db.IsVicePrincipalAuthorizedForGradeParams{TeacherID: teacherID, GradeID: gradeID})
}
func (r *NotificationRepository) TeacherIDByUser(ctx context.Context, userID uuid.UUID) (uuid.UUID, error) {
	row, err := r.queries.GetTeacherByUserID(ctx, userID)
	return row.ID, err
}
func (r *NotificationRepository) IsPrincipal(ctx context.Context, teacherID uuid.UUID) (bool, error) {
	return r.queries.IsPrincipal(ctx, teacherID)
}
func (r *NotificationRepository) IsTeacherAssignedToClass(ctx context.Context, classID, teacherID uuid.UUID) (bool, error) {
	return r.queries.IsTeacherAssignedToClass(ctx, db.IsTeacherAssignedToClassParams{ID: classID, FormTeacherID: pgtype.UUID{Bytes: teacherID, Valid: true}, TeacherID: teacherID})
}
func (r *NotificationRepository) StudentCurrentClass(ctx context.Context, studentID uuid.UUID) (uuid.UUID, error) {
	row, err := r.queries.GetStudentCurrentClass(ctx, studentID)
	return row.ID, err
}
func (r *NotificationRepository) IsTeacherAssignedToAnyStudentClass(ctx context.Context, studentIDs []uuid.UUID, teacherID uuid.UUID) (bool, error) {
	return r.queries.IsTeacherAssignedToAnyStudentClass(ctx, db.IsTeacherAssignedToAnyStudentClassParams{StudentIds: studentIDs, TeacherID: teacherID})
}
func (r *NotificationRepository) StudentUserID(ctx context.Context, id uuid.UUID) (pgtype.UUID, error) {
	row, err := r.queries.GetStudentByID(ctx, id)
	return row.UserID, err
}
func (r *NotificationRepository) GuardianUserID(ctx context.Context, id uuid.UUID) (pgtype.UUID, error) {
	row, err := r.queries.GetGuardianByID(ctx, id)
	return row.UserID, err
}
func (r *NotificationRepository) TeacherUserID(ctx context.Context, id uuid.UUID) (uuid.UUID, error) {
	row, err := r.queries.GetTeacherByID(ctx, id)
	return row.UserID, err
}

func mapNotification(row db.Notification) notification {
	return notification{ID: row.ID, Title: row.Title, Message: row.Message, Category: row.Category, Priority: row.Priority, Status: row.Status, RecipientRules: row.RecipientRules, CreatedBy: row.CreatedBy, SentAt: row.SentAt, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}
func notificationFromSent(id uuid.UUID, title, message, category, priority, status string, rules []byte, createdBy uuid.UUID, sentAt, createdAt, updatedAt pgtype.Timestamptz) notification {
	return notification{ID: id, Title: title, Message: message, Category: category, Priority: priority, Status: status, RecipientRules: rules, CreatedBy: createdBy, SentAt: sentAt, CreatedAt: createdAt, UpdatedAt: updatedAt}
}

func optionalText(v string) pgtype.Text { return pgtype.Text{String: v, Valid: v != ""} }

func optionalDate(t *time.Time) pgtype.Date {
	if t == nil {
		return pgtype.Date{}
	}
	return pgtype.Date{Time: *t, Valid: true}
}

func (r *NotificationRepository) SearchSent(ctx context.Context, f HistoryFilter) (HistoryPage, error) {
	params := db.SearchSentNotificationsParams{
		Search: optionalText(f.Search), Category: optionalText(f.Category), Priority: optionalText(f.Priority),
		FromDate: optionalDate(f.From), ToDate: optionalDate(f.To), PageLimit: f.Limit, PageOffset: f.Offset,
	}
	if f.SenderID != nil {
		params.SenderID = pgtype.UUID{Bytes: *f.SenderID, Valid: true}
	}
	rows, err := r.queries.SearchSentNotifications(ctx, params)
	if err != nil {
		return HistoryPage{}, err
	}
	page := HistoryPage{Items: make([]HistoryItem, len(rows)), Limit: f.Limit, Offset: f.Offset}
	for i, row := range rows {
		page.Items[i] = HistoryItem{ID: row.ID, Title: row.Title, Message: row.Message, Category: row.Category, Priority: row.Priority, SenderName: row.SenderName, SentAt: row.SentAt, RecipientCount: row.RecipientCount, ReadCount: row.ReadCount}
		page.Total = row.Total
	}
	if len(rows) == 0 && f.Offset > 0 {
		params.PageLimit, params.PageOffset = 1, 0
		probe, err := r.queries.SearchSentNotifications(ctx, params)
		if err != nil {
			return HistoryPage{}, err
		}
		if len(probe) > 0 {
			page.Total = probe[0].Total
		}
	}
	return page, nil
}

func (r *NotificationRepository) SearchMine(ctx context.Context, userID uuid.UUID, f InboxFilter) ([]MyNotificationResponse, int64, error) {
	params := db.SearchMyNotificationsParams{UserID: userID, Box: f.Box, Search: optionalText(f.Search), Category: optionalText(f.Category), PageLimit: f.Limit, PageOffset: f.Offset}
	rows, err := r.queries.SearchMyNotifications(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	out := make([]MyNotificationResponse, len(rows))
	var total int64
	for i, row := range rows {
		out[i] = MyNotificationResponse{RecipientID: row.RecipientID, NotificationID: row.NotificationID, Title: row.Title, Message: row.Message, Category: row.Category, Priority: row.Priority, SenderName: row.SenderName, SentAt: row.SentAt, IsRead: row.IsRead, IsArchived: row.IsArchived}
		total = row.Total
	}
	if len(rows) == 0 && f.Offset > 0 {
		params.PageLimit, params.PageOffset = 1, 0
		probe, err := r.queries.SearchMyNotifications(ctx, params)
		if err != nil {
			return nil, 0, err
		}
		if len(probe) > 0 {
			total = probe[0].Total
		}
	}
	return out, total, nil
}

func (r *NotificationRepository) CountBoxes(ctx context.Context, userID uuid.UUID) (InboxCounts, error) {
	row, err := r.queries.CountMyNotificationBoxes(ctx, userID)
	return InboxCounts{Unread: row.Unread, Read: row.Read, Archived: row.Archived}, err
}
