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

func (r *GuardianRepository) List(ctx context.Context) ([]db.Guardian, error) {
	return r.queries.ListGuardians(ctx)
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

// ListGuardianUserIDsByStudentIDs resolves every linked-in guardian's local
// user ID for a batch of students in one round trip (guardians without a
// provisioned portal login are excluded, since they have no user ID to
// notify).
func (r *GuardianRepository) ListGuardianUserIDsByStudentIDs(ctx context.Context, studentIDs []uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.queries.ListGuardianUserIDsByStudentIDs(ctx, studentIDs)
	if err != nil {
		return nil, err
	}
	ids := make([]uuid.UUID, 0, len(rows))
	for _, row := range rows {
		if row.Valid {
			ids = append(ids, uuid.UUID(row.Bytes))
		}
	}
	return ids, nil
}

func (r *GuardianRepository) GetPrimaryGuardian(ctx context.Context, studentID uuid.UUID) (db.Guardian, error) {
	return r.queries.GetPrimaryGuardian(ctx, studentID)
}

func (r *GuardianRepository) SetUserID(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	return r.queries.SetGuardianUserID(ctx, db.SetGuardianUserIDParams{
		ID:     id,
		UserID: pgtype.UUID{Bytes: userID, Valid: true},
	})
}

func (r *GuardianRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (db.Guardian, error) {
	return r.queries.GetGuardianByUserID(ctx, pgtype.UUID{Bytes: userID, Valid: true})
}

func (r *GuardianRepository) ListStudentsByGuardianUserID(ctx context.Context, userID uuid.UUID) ([]db.ListStudentsByGuardianUserIDRow, error) {
	return r.queries.ListStudentsByGuardianUserID(ctx, pgtype.UUID{Bytes: userID, Valid: true})
}

func (r *GuardianRepository) IsGuardianOfStudent(ctx context.Context, userID uuid.UUID, studentID uuid.UUID) (bool, error) {
	return r.queries.IsGuardianOfStudent(ctx, db.IsGuardianOfStudentParams{
		UserID:    pgtype.UUID{Bytes: userID, Valid: true},
		StudentID: studentID,
	})
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
