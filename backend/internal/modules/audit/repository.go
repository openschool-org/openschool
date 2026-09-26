package audit

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type Repository struct{ queries *db.Queries }

func NewRepository(pool *pgxpool.Pool) *Repository { return &Repository{queries: db.New(pool)} }

func (r *Repository) create(ctx context.Context, command createCommand) error {
	_, err := r.queries.CreateAuditLog(ctx, db.CreateAuditLogParams{EntityType: command.EntityType, EntityID: command.EntityID, Action: command.Action, ActorID: command.ActorID, Before: command.Before, After: command.After, Reason: command.Reason})
	return err
}

func (r *Repository) entityTypes(ctx context.Context) ([]string, error) {
	return r.queries.ListAuditEntityTypes(ctx)
}

func auditDate(t *time.Time) pgtype.Date {
	if t == nil {
		return pgtype.Date{}
	}
	return pgtype.Date{Time: *t, Valid: true}
}

func (r *Repository) list(ctx context.Context, f ListFilter) ([]row, int64, error) {
	limit, offset := f.Limit, f.Offset
	params := db.ListAuditLogsParams{
		EntityType: pgtype.Text{String: f.EntityType, Valid: f.EntityType != ""},
		Search:     pgtype.Text{String: f.Search, Valid: f.Search != ""},
		FromDate:   auditDate(f.From),
		ToDate:     auditDate(f.To),
		PageLimit:  limit,
		PageOffset: offset,
	}
	if f.EntityID != nil {
		params.EntityID = pgtype.UUID{Bytes: *f.EntityID, Valid: true}
	}
	rows, err := r.queries.ListAuditLogs(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	result := make([]row, len(rows))
	var total int64
	for i, value := range rows {
		result[i] = row{ID: value.ID, EntityType: value.EntityType, EntityID: value.EntityID, Action: value.Action, ActorID: value.ActorID, Before: value.Before, After: value.After, Reason: value.Reason, CreatedAt: value.CreatedAt, ActorName: value.ActorName}
		total = value.Total
	}
	if len(rows) == 0 && offset > 0 {
		// COUNT(*) OVER () is absent when the offset lands past the last
		// page, so it's re-probed here rather than reporting total=0.
		probeParams := params
		probeParams.PageLimit, probeParams.PageOffset = 1, 0
		probe, err := r.queries.ListAuditLogs(ctx, probeParams)
		if err != nil {
			return nil, 0, err
		}
		if len(probe) > 0 {
			total = probe[0].Total
		}
	}
	return result, total, nil
}
