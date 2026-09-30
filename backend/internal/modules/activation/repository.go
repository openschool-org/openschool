package activation

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/authz"
)

// Repository is activation's only sqlc adapter.
type Repository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool, queries: db.New(pool)}
}

func pgUUID(id *uuid.UUID) pgtype.UUID {
	if id == nil {
		return pgtype.UUID{}
	}
	return pgtype.UUID{Bytes: *id, Valid: true}
}

func pgTime(t *time.Time) pgtype.Timestamptz {
	if t == nil {
		return pgtype.Timestamptz{}
	}
	return pgtype.Timestamptz{Time: *t, Valid: true}
}

func timePtr(t pgtype.Timestamptz) *time.Time {
	if !t.Valid {
		return nil
	}
	return &t.Time
}

func toSettings(row db.ActivationSetting) Settings {
	return Settings{
		StudentEnabled: row.StudentEnabled, ParentEnabled: row.ParentEnabled,
		OpensAt: timePtr(row.OpensAt), ClosesAt: timePtr(row.ClosesAt), CodeTTLDays: int(row.CodeTtlDays),
	}
}

func (r *Repository) settings(ctx context.Context) (Settings, error) {
	row, err := r.queries.GetActivationSettings(ctx)
	return toSettings(row), err
}

func (r *Repository) updateSettings(ctx context.Context, s Settings) (Settings, error) {
	row, err := r.queries.UpdateActivationSettings(ctx, db.UpdateActivationSettingsParams{
		StudentEnabled: s.StudentEnabled, ParentEnabled: s.ParentEnabled,
		OpensAt: pgTime(s.OpensAt), ClosesAt: pgTime(s.ClosesAt), CodeTtlDays: int32(s.CodeTTLDays),
	})
	return toSettings(row), err
}

// toCodeRecord folds the student or guardian columns into one shape.
func toCodeRecord(id uuid.UUID, role string, studentID, guardianID pgtype.UUID, locked pgtype.Timestamptz,
	index pgtype.Text, studentUser pgtype.UUID, nic pgtype.Text, guardianUser pgtype.UUID) codeRecord {
	rec := codeRecord{ID: id, Role: role, LockedUntil: timePtr(locked)}
	if role == authz.RoleStudent {
		rec.RecordID, rec.Identifier, rec.HasLogin = studentID.Bytes, index.String, studentUser.Valid
	} else {
		rec.RecordID, rec.Identifier, rec.HasLogin = guardianID.Bytes, nic.String, guardianUser.Valid
	}
	return rec
}

func (r *Repository) usableCode(ctx context.Context, hash string) (codeRecord, error) {
	row, err := r.queries.GetUsableActivationCode(ctx, hash)
	if err != nil {
		return codeRecord{}, err
	}
	return toCodeRecord(row.ID, row.Role, row.StudentID, row.GuardianID, row.LockedUntil,
		row.IndexNumber, row.StudentUserID, row.NicNumber, row.GuardianUserID), nil
}

func (r *Repository) usableCodeByID(ctx context.Context, id uuid.UUID) (codeRecord, error) {
	row, err := r.queries.GetUsableActivationCodeByID(ctx, id)
	if err != nil {
		return codeRecord{}, err
	}
	return toCodeRecord(row.ID, row.Role, row.StudentID, row.GuardianID, row.LockedUntil,
		row.IndexNumber, row.StudentUserID, row.NicNumber, row.GuardianUserID), nil
}

func (r *Repository) recordFailure(ctx context.Context, id uuid.UUID) error {
	return r.queries.RecordActivationFailure(ctx, id)
}

func (r *Repository) resetFailures(ctx context.Context, id uuid.UUID) error {
	return r.queries.ResetActivationFailures(ctx, id)
}

func (r *Repository) createEmailToken(ctx context.Context, hash string, codeID uuid.UUID, email string, expiresAt time.Time) error {
	return r.queries.CreateActivationEmailToken(ctx, db.CreateActivationEmailTokenParams{
		TokenHash: hash, CodeID: codeID, Email: email, ExpiresAt: pgtype.Timestamptz{Time: expiresAt, Valid: true},
	})
}

func (r *Repository) peekEmailToken(ctx context.Context, hash string) (uuid.UUID, string, error) {
	row, err := r.queries.PeekActivationEmailToken(ctx, hash)
	return row.CodeID, row.Email, err
}

func (r *Repository) consumeEmailToken(ctx context.Context, hash string) (bool, error) {
	n, err := r.queries.ConsumeActivationEmailToken(ctx, hash)
	return n == 1, err
}

func (r *Repository) claimCode(ctx context.Context, id uuid.UUID) (bool, error) {
	n, err := r.queries.ClaimActivationCode(ctx, id)
	return n == 1, err
}

func (r *Repository) releaseCode(ctx context.Context, id uuid.UUID) error {
	return r.queries.ReleaseActivationCode(ctx, id)
}

func (r *Repository) emailTaken(ctx context.Context, email string) (bool, error) {
	return r.queries.ActivationEmailTaken(ctx, email)
}

func (r *Repository) recordName(ctx context.Context, role string, id uuid.UUID) (string, error) {
	if role == authz.RoleStudent {
		return r.queries.ActivationStudentName(ctx, id)
	}
	return r.queries.ActivationGuardianName(ctx, id)
}

func (r *Repository) createUser(ctx context.Context, id uuid.UUID, email, name, role string) error {
	_, err := r.queries.CreateUser(ctx, db.CreateUserParams{ID: id, Email: email, FullName: name, Role: role})
	return err
}

func (r *Repository) deleteUser(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteUser(ctx, id)
}

func (r *Repository) linkRecord(ctx context.Context, role string, recordID, userID uuid.UUID, email string) (bool, error) {
	user := pgtype.UUID{Bytes: userID, Valid: true}
	var n int64
	var err error
	if role == authz.RoleStudent {
		n, err = r.queries.LinkActivatedStudent(ctx, db.LinkActivatedStudentParams{ID: recordID, UserID: user})
	} else {
		n, err = r.queries.LinkActivatedGuardian(ctx, db.LinkActivatedGuardianParams{ID: recordID, UserID: user, Email: pgtype.Text{String: email, Valid: true}})
	}
	return n == 1, err
}

func (r *Repository) targets(ctx context.Context, role string, classID, recordID *uuid.UUID) ([]target, error) {
	if role == authz.RoleStudent {
		rows, err := r.queries.ActivationStudentTargets(ctx, db.ActivationStudentTargetsParams{ClassID: pgUUID(classID), StudentID: pgUUID(recordID)})
		if err != nil {
			return nil, err
		}
		out := make([]target, len(rows))
		for i, row := range rows {
			out[i] = target{
				ID: row.ID, Name: row.FullName, Index: row.IndexNumber,
				ClassName: row.ClassName, GradeName: row.GradeName, GradeOrder: int(row.GradeOrder), FormTeacher: row.FormTeacher,
			}
		}
		return out, nil
	}
	rows, err := r.queries.ActivationGuardianTargets(ctx, db.ActivationGuardianTargetsParams{ClassID: pgUUID(classID), GuardianID: pgUUID(recordID)})
	if err != nil {
		return nil, err
	}
	out := make([]target, len(rows))
	for i, row := range rows {
		out[i] = target{
			ID: row.ID, Name: row.FullName, Detail: row.Children,
			ClassName: row.ClassName, GradeName: row.GradeName, GradeOrder: int(row.GradeOrder), FormTeacher: row.FormTeacher,
		}
	}
	return out, nil
}

// issueCodes revokes each record's old code and bulk-inserts the new ones in one transaction.
func (r *Repository) issueCodes(ctx context.Context, batchID uuid.UUID, role string, codes []newCode, expiresAt time.Time, actor uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	q := r.queries.WithTx(tx)

	ids := make([]uuid.UUID, len(codes))
	rows := make([]db.InsertActivationCodesParams, len(codes))
	for i, c := range codes {
		ids[i] = c.RecordID
		row := db.InsertActivationCodesParams{
			BatchID: batchID, Role: role, CodeHash: c.Hash,
			ExpiresAt: pgtype.Timestamptz{Time: expiresAt, Valid: true},
			CreatedBy: pgtype.UUID{Bytes: actor, Valid: actor != uuid.Nil},
		}
		if role == authz.RoleStudent {
			row.StudentID = pgtype.UUID{Bytes: c.RecordID, Valid: true}
		} else {
			row.GuardianID = pgtype.UUID{Bytes: c.RecordID, Valid: true}
		}
		rows[i] = row
	}
	if role == authz.RoleStudent {
		err = q.RevokeLiveActivationCodesForStudents(ctx, ids)
	} else {
		err = q.RevokeLiveActivationCodesForGuardians(ctx, ids)
	}
	if err != nil {
		return fmt.Errorf("revoke old codes: %w", err)
	}
	if _, err := q.InsertActivationCodes(ctx, rows); err != nil {
		return fmt.Errorf("insert codes: %w", err)
	}
	return tx.Commit(ctx)
}

func (r *Repository) batches(ctx context.Context) ([]Batch, error) {
	rows, err := r.queries.ListActivationBatches(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]Batch, len(rows))
	for i, row := range rows {
		out[i] = Batch{
			BatchID: row.BatchID, Role: row.Role, CreatedAt: row.CreatedAt.Time, ExpiresAt: row.ExpiresAt.Time,
			Total: row.Total, Used: row.Used, Revoked: row.Revoked, Expired: row.Expired,
		}
	}
	return out, nil
}

func (r *Repository) revokeBatch(ctx context.Context, batchID uuid.UUID) (int64, error) {
	return r.queries.RevokeActivationBatch(ctx, batchID)
}
