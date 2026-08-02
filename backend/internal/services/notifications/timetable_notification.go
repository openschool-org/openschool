package notifications

import (
	"context"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	repositories "github.com/openschool-org/openschool/internal/repositories/notifications"
)

// NotificationService writes and serves the minimal in-app notification
// feed. No email/SMS delivery — see the timetable module plan.
type NotificationService struct {
	repo *repositories.TimetableNotificationRepository
}

func NewNotificationService(repo *repositories.TimetableNotificationRepository) *NotificationService {
	return &NotificationService{repo: repo}
}

func (s *NotificationService) Notify(ctx context.Context, userID uuid.UUID, timetableID *uuid.UUID, notifType, message string) {
	// notification delivery is best-effort and must never fail the
	// workflow action that triggered it
	_, _ = s.repo.Create(ctx, userID, timetableID, notifType, message)
}

func (s *NotificationService) ListByUser(ctx context.Context, userID uuid.UUID) ([]db.TimetableNotification, error) {
	return s.repo.ListByUser(ctx, userID)
}

func (s *NotificationService) CountUnread(ctx context.Context, userID uuid.UUID) (int64, error) {
	return s.repo.CountUnread(ctx, userID)
}

func (s *NotificationService) MarkRead(ctx context.Context, id, userID uuid.UUID) error {
	return s.repo.MarkRead(ctx, id, userID)
}
