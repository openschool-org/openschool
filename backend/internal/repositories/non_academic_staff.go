package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type NonAcademicStaffRepository struct {
	queries *db.Queries
}

func NewNonAcademicStaffRepository(pool *pgxpool.Pool) *NonAcademicStaffRepository {
	return &NonAcademicStaffRepository{queries: db.New(pool)}
}

func (r *NonAcademicStaffRepository) NextEmployeeNumber(ctx context.Context) (string, error) {
	return r.queries.NextNonAcademicEmployeeNumber(ctx)
}

func (r *NonAcademicStaffRepository) Create(ctx context.Context, params db.CreateNonAcademicStaffParams) (db.NonAcademicStaff, error) {
	return r.queries.CreateNonAcademicStaff(ctx, params)
}

func (r *NonAcademicStaffRepository) GetByID(ctx context.Context, id uuid.UUID) (db.NonAcademicStaff, error) {
	return r.queries.GetNonAcademicStaffByID(ctx, id)
}

func (r *NonAcademicStaffRepository) List(ctx context.Context, search string, designation string) ([]db.NonAcademicStaff, error) {
	return r.queries.ListNonAcademicStaff(ctx, db.ListNonAcademicStaffParams{
		Search:      pgtype.Text{String: search, Valid: search != ""},
		Designation: pgtype.Text{String: designation, Valid: designation != ""},
	})
}

func (r *NonAcademicStaffRepository) Update(ctx context.Context, params db.UpdateNonAcademicStaffParams) (db.NonAcademicStaff, error) {
	return r.queries.UpdateNonAcademicStaff(ctx, params)
}

func (r *NonAcademicStaffRepository) UpdateEmploymentStatus(ctx context.Context, id uuid.UUID, status string) (db.NonAcademicStaff, error) {
	return r.queries.UpdateNonAcademicStaffEmploymentStatus(ctx, db.UpdateNonAcademicStaffEmploymentStatusParams{
		ID:               id,
		EmploymentStatus: status,
	})
}

func (r *NonAcademicStaffRepository) UpdateHouse(ctx context.Context, id uuid.UUID, houseID *uuid.UUID) (db.NonAcademicStaff, error) {
	var houseParam pgtype.UUID
	if houseID != nil {
		houseParam = pgtype.UUID{Bytes: *houseID, Valid: true}
	}
	return r.queries.UpdateNonAcademicStaffHouse(ctx, db.UpdateNonAcademicStaffHouseParams{
		ID:      id,
		HouseID: houseParam,
	})
}

func (r *NonAcademicStaffRepository) Delete(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteNonAcademicStaff(ctx, id)
}
