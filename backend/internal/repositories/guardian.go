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

func (r *GuardianRepository) GetByID(ctx context.Context, id uuid.UUID) (db.Guardian, error) {
	return r.queries.GetGuardianByID(ctx, id)
}

// List returns every guardian, optionally filtered by a name/phone/email search term (pass "" for no filter) and/or restricted to orphans — guardians linked to no student.
func (r *GuardianRepository) List(ctx context.Context, search string, orphansOnly bool) ([]db.Guardian, error) {
	return r.queries.ListGuardians(ctx, db.ListGuardiansParams{
		Search:      pgtype.Text{String: search, Valid: search != ""},
		OrphansOnly: pgtype.Bool{Bool: orphansOnly, Valid: orphansOnly},
	})
}

// FindDuplicateCandidates returns guardians sharing the given phone (or email) — a soft "this may already exist" signal at create time, never a hard block.
func (r *GuardianRepository) FindDuplicateCandidates(ctx context.Context, phone, email string) ([]db.Guardian, error) {
	return r.queries.FindGuardianDuplicateCandidates(ctx, db.FindGuardianDuplicateCandidatesParams{
		Phone: phone,
		Email: pgtype.Text{String: email, Valid: email != ""},
	})
}

// ListStudentsByGuardianID returns the students linked to a guardian, regardless of portal login — used by the guardian directory's "children" column.
func (r *GuardianRepository) ListStudentsByGuardianID(ctx context.Context, guardianID uuid.UUID) ([]db.StudentProfile, error) {
	return r.queries.ListStudentsByGuardianID(ctx, guardianID)
}

func (r *GuardianRepository) Delete(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteGuardian(ctx, id)
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

// ListGuardianUserIDsByStudentIDs resolves guardians' local user IDs for a batch of students, excluding guardians with no portal login (nothing to notify).
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

func (r *GuardianRepository) SetUserID(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	return r.queries.SetGuardianUserID(ctx, db.SetGuardianUserIDParams{
		ID:     id,
		UserID: pgtype.UUID{Bytes: userID, Valid: true},
	})
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

func (r *GuardianRepository) CreateWithNullable(ctx context.Context, fullName string, relationship string, phone string, email string, nicNumber string) (db.Guardian, error) {
	return r.queries.CreateGuardian(ctx, db.CreateGuardianParams{
		FullName:     fullName,
		Relationship: relationship,
		Phone:        phone,
		Email:        pgtype.Text{String: email, Valid: email != ""},
		NicNumber:    nicNumber,
	})
}

func (r *GuardianRepository) UpdateWithNullable(ctx context.Context, id uuid.UUID, fullName string, relationship string, phone string, email string, nicNumber string) (db.Guardian, error) {
	return r.queries.UpdateGuardian(ctx, db.UpdateGuardianParams{
		ID:           id,
		FullName:     fullName,
		Relationship: relationship,
		Phone:        phone,
		Email:        pgtype.Text{String: email, Valid: email != ""},
		NicNumber:    nicNumber,
	})
}

func (r *GuardianRepository) GetByUserIDAndNIC(ctx context.Context, userID uuid.UUID, nicNumber string) (db.Guardian, error) {
	return r.queries.GetGuardianByUserIDAndNIC(ctx, db.GetGuardianByUserIDAndNICParams{
		UserID:    pgtype.UUID{Bytes: userID, Valid: true},
		NicNumber: nicNumber,
	})
}
