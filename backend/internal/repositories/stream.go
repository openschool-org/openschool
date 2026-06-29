package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type StreamRepository struct {
	queries *db.Queries
}

func NewStreamRepository(pool *pgxpool.Pool) *StreamRepository {
	return &StreamRepository{queries: db.New(pool)}
}

func (r *StreamRepository) Create(ctx context.Context, name string) (db.Stream, error) {
	return r.queries.CreateStream(ctx, name)
}

func (r *StreamRepository) GetByID(ctx context.Context, id uuid.UUID) (db.Stream, error) {
	return r.queries.GetStreamByID(ctx, id)
}

func (r *StreamRepository) List(ctx context.Context) ([]db.Stream, error) {
	return r.queries.ListStreams(ctx)
}

func (r *StreamRepository) Update(ctx context.Context, params db.UpdateStreamParams) (db.Stream, error) {
	return r.queries.UpdateStream(ctx, params)
}

func (r *StreamRepository) Delete(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteStream(ctx, id)
}

func (r *StreamRepository) CreateGroup(ctx context.Context, params db.CreateStreamGroupParams) (db.StreamGroup, error) {
	return r.queries.CreateStreamGroup(ctx, params)
}

func (r *StreamRepository) GetGroupByID(ctx context.Context, id uuid.UUID) (db.StreamGroup, error) {
	return r.queries.GetStreamGroupByID(ctx, id)
}

func (r *StreamRepository) ListGroupsByStream(ctx context.Context, streamID uuid.UUID) ([]db.StreamGroup, error) {
	return r.queries.ListStreamGroupsByStream(ctx, streamID)
}

func (r *StreamRepository) UpdateGroup(ctx context.Context, params db.UpdateStreamGroupParams) (db.StreamGroup, error) {
	return r.queries.UpdateStreamGroup(ctx, params)
}

func (r *StreamRepository) DeleteGroup(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteStreamGroup(ctx, id)
}
