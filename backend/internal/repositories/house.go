package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

// ignoreNoRows turns pgx.ErrNoRows into a nil error, for callers that
// signal "not found" via a separate bool rather than an error.
func ignoreNoRows(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	return err
}

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

func (r *HouseRepository) ListTeachersMissingHouse(ctx context.Context) ([]db.TeacherProfile, error) {
	return r.queries.ListTeachersMissingHouse(ctx)
}

func (r *HouseRepository) UpdateStudentHouse(ctx context.Context, params db.UpdateStudentHouseParams) (db.StudentProfile, error) {
	return r.queries.UpdateStudentHouse(ctx, params)
}

func (r *HouseRepository) UpdateTeacherHouse(ctx context.Context, params db.UpdateTeacherHouseParams) (db.TeacherProfile, error) {
	return r.queries.UpdateTeacherHouse(ctx, params)
}

// PickForStudent returns the house currently holding the fewest students
// (random tiebreak), or ok=false if no houses exist yet.
func (r *HouseRepository) PickForStudent(ctx context.Context) (id uuid.UUID, ok bool, err error) {
	id, err = r.queries.PickBalancedHouseForStudent(ctx)
	if err != nil {
		return uuid.UUID{}, false, ignoreNoRows(err)
	}
	return id, true, nil
}

// PickForTeacher mirrors PickForStudent against the teacher pool.
func (r *HouseRepository) PickForTeacher(ctx context.Context) (id uuid.UUID, ok bool, err error) {
	id, err = r.queries.PickBalancedHouseForTeacher(ctx)
	if err != nil {
		return uuid.UUID{}, false, ignoreNoRows(err)
	}
	return id, true, nil
}
