package services

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/repositories"
)

// AuditService records accountable, hard-to-reverse actions — manual house
// re-assignments and admin edits to attendance made after the 24h lock —
// so they can be traced back to who did what and why.
type AuditService struct {
	repo *repositories.AuditRepository
}

func NewAuditService(repo *repositories.AuditRepository) *AuditService {
	return &AuditService{repo: repo}
}

func toJSON(v interface{}) []byte {
	if v == nil {
		return nil
	}
	b, err := json.Marshal(v)
	if err != nil {
		return nil
	}
	return b
}

// Record writes one audit entry. before/after may be any JSON-marshalable
// value (or nil) and reason may be empty.
func (s *AuditService) Record(ctx context.Context, entityType string, entityID uuid.UUID, action string, actorID uuid.UUID, before, after interface{}, reason string) error {
	_, err := s.repo.Create(ctx, db.CreateAuditLogParams{
		EntityType: entityType,
		EntityID:   entityID,
		Action:     action,
		ActorID:    pgtype.UUID{Bytes: actorID, Valid: actorID != uuid.Nil},
		Before:     toJSON(before),
		After:      toJSON(after),
		Reason:     pgtype.Text{String: reason, Valid: reason != ""},
	})
	return err
}

func (s *AuditService) List(ctx context.Context, entityType string, entityID *uuid.UUID) ([]db.ListAuditLogsRow, error) {
	params := db.ListAuditLogsParams{
		EntityType: pgtype.Text{String: entityType, Valid: entityType != ""},
	}
	if entityID != nil {
		params.EntityID = pgtype.UUID{Bytes: *entityID, Valid: true}
	}
	return s.repo.List(ctx, params)
}
