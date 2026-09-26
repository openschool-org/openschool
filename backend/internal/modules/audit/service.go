// Package audit owns append-only audit recording and administrative audit-log reads.
package audit

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type createCommand struct {
	EntityType string
	EntityID   uuid.UUID
	Action     string
	ActorID    pgtype.UUID
	Before     []byte
	After      []byte
	Reason     pgtype.Text
}

type row struct {
	ID         uuid.UUID
	EntityType string
	EntityID   uuid.UUID
	Action     string
	ActorID    pgtype.UUID
	Before     []byte
	After      []byte
	Reason     pgtype.Text
	CreatedAt  pgtype.Timestamptz
	ActorName  pgtype.Text
}

// ListFilter narrows the audit log; zero values mean "no filter".
type ListFilter struct {
	EntityType    string
	EntityID      *uuid.UUID
	Search        string
	From, To      *time.Time
	Limit, Offset int32
}

type store interface {
	create(context.Context, createCommand) error
	list(context.Context, ListFilter) ([]row, int64, error)
	entityTypes(context.Context) ([]string, error)
}

type Service struct{ store store }

func NewService(store store) *Service { return &Service{store: store} }

func toJSON(value interface{}) []byte {
	if value == nil {
		return nil
	}
	data, err := json.Marshal(value)
	if err != nil {
		return nil
	}
	return data
}

// Record appends one best-effort audit event through the shared AuditRecorder port.
func (s *Service) Record(ctx context.Context, entityType string, entityID uuid.UUID, action string, actorID uuid.UUID, before, after interface{}, reason string) error {
	return s.store.create(ctx, createCommand{
		EntityType: entityType,
		EntityID:   entityID,
		Action:     action,
		ActorID:    pgtype.UUID{Bytes: actorID, Valid: actorID != uuid.Nil},
		Before:     toJSON(before),
		After:      toJSON(after),
		Reason:     pgtype.Text{String: reason, Valid: reason != ""},
	})
}

// EntityTypes lists every entity type that has at least one entry.
func (s *Service) EntityTypes(ctx context.Context) ([]string, error) {
	return s.store.entityTypes(ctx)
}

func (s *Service) List(ctx context.Context, filter ListFilter) ([]AuditLogResponse, int64, error) {
	rows, total, err := s.store.list(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	result := make([]AuditLogResponse, len(rows))
	for i, value := range rows {
		result[i] = AuditLogResponse{ID: value.ID, EntityType: value.EntityType, EntityID: value.EntityID, Action: value.Action, Before: value.Before, After: value.After, CreatedAt: value.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00")}
		if value.ActorID.Valid {
			id := uuid.UUID(value.ActorID.Bytes)
			result[i].ActorID = &id
		}
		if value.ActorName.Valid {
			name := value.ActorName.String
			result[i].ActorName = &name
		}
		if value.Reason.Valid {
			reason := value.Reason.String
			result[i].Reason = &reason
		}
	}
	return result, total, nil
}
