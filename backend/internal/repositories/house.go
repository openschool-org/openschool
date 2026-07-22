package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type HouseRepository struct {
	queries *db.Queries
}

func NewHouseRepository(pool *pgxpool.Pool) *HouseRepository {
	return &HouseRepository{queries: db.New(pool)}
}

func (r *HouseRepository) Create(ctx context.Context, params db.CreateHouseParams) (db.House, error) {
	return r.queries.CreateHouse(ctx, params)
}

func (r *HouseRepository) GetByID(ctx context.Context, id uuid.UUID) (db.House, error) {
	return r.queries.GetHouseByID(ctx, id)
}

func (r *HouseRepository) List(ctx context.Context) ([]db.House, error) {
	return r.queries.ListHouses(ctx)
}

func (r *HouseRepository) Update(ctx context.Context, params db.UpdateHouseParams) (db.House, error) {
	return r.queries.UpdateHouse(ctx, params)
}

func (r *HouseRepository) Delete(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteHouse(ctx, id)
}

func (r *HouseRepository) ListStudentsMissingHouse(ctx context.Context) ([]db.StudentProfile, error) {
	return r.queries.ListStudentsMissingHouse(ctx)
}

func (r *HouseRepository) UpdateStudentHouse(ctx context.Context, params db.UpdateStudentHouseParams) (db.StudentProfile, error) {
	return r.queries.UpdateStudentHouse(ctx, params)
}
