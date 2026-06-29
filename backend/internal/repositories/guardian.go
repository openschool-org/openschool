package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type GuardianRepository struct {
	queries *db.Queries
}

func NewGuardianRepository(pool *pgxpool.Pool) *GuardianRepository {
	return &GuardianRepository{queries: db.New(pool)}
}

func (r *GuardianRepository) Create(ctx context.Context, params db.CreateGuardianParams) (db.Guardian, error) {
	return r.queries.CreateGuardian(ctx, params)
}

func (r *GuardianRepository) GetByID(ctx context.Context, id uuid.UUID) (db.Guardian, error) {
	return r.queries.GetGuardianByID(ctx, id)
}

func (r *GuardianRepository) Update(ctx context.Context, params db.UpdateGuardianParams) (db.Guardian, error) {
	return r.queries.UpdateGuardian(ctx, params)
}

func (r *GuardianRepository) LinkToStudent(ctx context.Context, studentID uuid.UUID, guardianID uuid.UUID, isPrimary bool) error {
	return r.queries.LinkGuardianToStudent(ctx, db.LinkGuardianToStudentParams{
		StudentID:        studentID,
		GuardianID:       guardianID,
		IsPrimaryContact: isPrimary,
	})
}

func (r *GuardianRepository) UnlinkFromStudent(ctx context.Context, studentID uuid.UUID, guardianID uuid.UUID) error {
	return r.queries.UnlinkGuardianFromStudent(ctx, db.UnlinkGuardianFromStudentParams{
		StudentID:  studentID,
		GuardianID: guardianID,
	})
}

func (r *GuardianRepository) SetPrimaryContact(ctx context.Context, studentID uuid.UUID, guardianID uuid.UUID) error {
	return r.queries.SetPrimaryContact(ctx, db.SetPrimaryContactParams{
		StudentID:  studentID,
		GuardianID: guardianID,
	})
}

func (r *GuardianRepository) ListByStudent(ctx context.Context, studentID uuid.UUID) ([]db.ListGuardiansByStudentRow, error) {
	return r.queries.ListGuardiansByStudent(ctx, studentID)
}

func (r *GuardianRepository) GetPrimaryGuardian(ctx context.Context, studentID uuid.UUID) (db.Guardian, error) {
	return r.queries.GetPrimaryGuardian(ctx, studentID)
}

func (r *GuardianRepository) CreateWithNullable(ctx context.Context, fullName string, relationship string, phone string, email string) (db.Guardian, error) {
	return r.queries.CreateGuardian(ctx, db.CreateGuardianParams{
		FullName:     fullName,
		Relationship: relationship,
		Phone:        phone,
		Email:        pgtype.Text{String: email, Valid: email != ""},
	})
}

func (r *GuardianRepository) UpdateWithNullable(ctx context.Context, id uuid.UUID, fullName string, relationship string, phone string, email string) (db.Guardian, error) {
	return r.queries.UpdateGuardian(ctx, db.UpdateGuardianParams{
		ID:           id,
		FullName:     fullName,
		Relationship: relationship,
		Phone:        phone,
		Email:        pgtype.Text{String: email, Valid: email != ""},
	})
}
