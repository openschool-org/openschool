package notifications

import (
	"context"

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

func (r *NotificationRepository) Create(ctx context.Context, params db.CreateNotificationParams) (db.Notification, error) {
	return r.queries.CreateNotification(ctx, params)
}

func (r *NotificationRepository) UpdateDraft(ctx context.Context, params db.UpdateNotificationDraftParams) (db.Notification, error) {
	return r.queries.UpdateNotificationDraft(ctx, params)
}

func (r *NotificationRepository) MarkSent(ctx context.Context, id uuid.UUID) (db.Notification, error) {
	return r.queries.MarkNotificationSent(ctx, id)
}

func (r *NotificationRepository) GetByID(ctx context.Context, id uuid.UUID) (db.Notification, error) {
	return r.queries.GetNotificationByID(ctx, id)
}

func (r *NotificationRepository) DeleteDraft(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteDraftNotification(ctx, id)
}

func (r *NotificationRepository) ListSentByUser(ctx context.Context, userID uuid.UUID) ([]db.ListSentNotificationsByUserRow, error) {
	return r.queries.ListSentNotificationsByUser(ctx, userID)
}

func (r *NotificationRepository) ListAllSent(ctx context.Context) ([]db.ListAllSentNotificationsRow, error) {
	return r.queries.ListAllSentNotifications(ctx)
}

func (r *NotificationRepository) ListMyDrafts(ctx context.Context, userID uuid.UUID) ([]db.Notification, error) {
	return r.queries.ListMyDraftNotifications(ctx, userID)
}

func (r *NotificationRepository) GetStats(ctx context.Context, id uuid.UUID) (db.GetNotificationRecipientStatsRow, error) {
	return r.queries.GetNotificationRecipientStats(ctx, id)
}

// Recipients (notification center)

func (r *NotificationRepository) AddRecipient(ctx context.Context, notificationID, userID uuid.UUID) error {
	return r.queries.CreateNotificationRecipient(ctx, db.CreateNotificationRecipientParams{NotificationID: notificationID, UserID: userID})
}

func (r *NotificationRepository) ListMine(ctx context.Context, userID uuid.UUID) ([]db.ListMyNotificationsRow, error) {
	return r.queries.ListMyNotifications(ctx, userID)
}

func (r *NotificationRepository) ListMyArchived(ctx context.Context, userID uuid.UUID) ([]db.ListMyArchivedNotificationsRow, error) {
	return r.queries.ListMyArchivedNotifications(ctx, userID)
}

func (r *NotificationRepository) CountMyUnread(ctx context.Context, userID uuid.UUID) (int64, error) {
	return r.queries.CountMyUnreadNotifications(ctx, userID)
}

func (r *NotificationRepository) MarkRead(ctx context.Context, notificationID, userID uuid.UUID) error {
	return r.queries.MarkNotificationRecipientRead(ctx, db.MarkNotificationRecipientReadParams{NotificationID: notificationID, UserID: userID})
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

// IsTeacherAssignedToSubject reuses the query already generated for the
// timetable module's validator — sqlc queries share one flat db.Queries
// type across the whole app regardless of which package registered them.
func (r *NotificationRepository) IsTeacherAssignedToSubject(ctx context.Context, teacherID, subjectID uuid.UUID) (bool, error) {
	return r.queries.IsTeacherAssignedToSubject(ctx, db.IsTeacherAssignedToSubjectParams{TeacherID: teacherID, SubjectID: subjectID})
}
