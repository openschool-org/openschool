package notifications

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

func pgUUID(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

type TimetableNotificationRepository struct {
	queries *db.Queries
}

func NewTimetableNotificationRepository(pool *pgxpool.Pool) *TimetableNotificationRepository {
	return &TimetableNotificationRepository{queries: db.New(pool)}
}

func (r *TimetableNotificationRepository) Create(ctx context.Context, userID uuid.UUID, timetableID *uuid.UUID, notifType, message string) (db.TimetableNotification, error) {
	params := db.CreateTimetableNotificationParams{
		UserID:  userID,
		Type:    notifType,
		Message: message,
	}
	if timetableID != nil {
		params.TimetableID = pgUUID(*timetableID)
	}
	return r.queries.CreateTimetableNotification(ctx, params)
}

func (r *TimetableNotificationRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]db.TimetableNotification, error) {
	return r.queries.ListTimetableNotificationsByUser(ctx, userID)
}

func (r *TimetableNotificationRepository) CountUnread(ctx context.Context, userID uuid.UUID) (int64, error) {
	return r.queries.CountUnreadTimetableNotifications(ctx, userID)
}

func (r *TimetableNotificationRepository) MarkRead(ctx context.Context, id, userID uuid.UUID) error {
	return r.queries.MarkTimetableNotificationRead(ctx, db.MarkTimetableNotificationReadParams{ID: id, UserID: userID})
}
