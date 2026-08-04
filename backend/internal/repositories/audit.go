package repositories

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type AuditRepository struct {
	queries *db.Queries
}

func NewAuditRepository(pool *pgxpool.Pool) *AuditRepository {
	return &AuditRepository{queries: db.New(pool)}
}

func (r *AuditRepository) Create(ctx context.Context, params db.CreateAuditLogParams) (db.AuditLog, error) {
	return r.queries.CreateAuditLog(ctx, params)
}

func (r *AuditRepository) List(ctx context.Context, params db.ListAuditLogsParams) ([]db.ListAuditLogsRow, error) {
	return r.queries.ListAuditLogs(ctx, params)
}
