package auth

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

// Repository is Auth's only sqlc adapter. Password-reset hashes and generated
// database rows never cross this boundary.
type Repository struct {
	queries *db.Queries
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{queries: db.New(pool)}
}

func toUserAccount(row db.User) userAccount {
	return userAccount{
		ID: row.ID, Email: row.Email, Role: row.Role,
		CreatedAt: row.CreatedAt.Time, KeptDefaultPassword: row.KeptDefaultPassword,
		MustChangePassword: row.MustChangePassword,
	}
}

func (r *Repository) userByEmail(ctx context.Context, email string) (userAccount, error) {
	row, err := r.queries.GetUserByEmail(ctx, email)
	return toUserAccount(row), err
}

func (r *Repository) userByID(ctx context.Context, id uuid.UUID) (userAccount, error) {
	row, err := r.queries.GetUserByID(ctx, id)
	return toUserAccount(row), err
}

func (r *Repository) teacherCredentialsMatch(ctx context.Context, userID uuid.UUID, nic string) bool {
	_, err := r.queries.GetTeacherByUserIDAndNIC(ctx, db.GetTeacherByUserIDAndNICParams{UserID: userID, NicNumber: nic})
	return err == nil
}

func (r *Repository) studentCredentialsMatch(ctx context.Context, userID uuid.UUID, indexNumber string) bool {
	row, err := r.queries.GetStudentByUserID(ctx, pgtype.UUID{Bytes: userID, Valid: true})
	return err == nil && row.IndexNumber == indexNumber
}

// createResetToken issues a new link and ends any earlier unused one.
func (r *Repository) createResetToken(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	if err := r.queries.RevokePasswordResetTokens(ctx, userID); err != nil {
		return err
	}
	_, err := r.queries.CreatePasswordResetToken(ctx, db.CreatePasswordResetTokenParams{
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: pgtype.Timestamptz{Time: expiresAt, Valid: true},
	})
	return err
}

func (r *Repository) consumeResetToken(ctx context.Context, tokenHash string) (resetToken, error) {
	row, err := r.queries.ConsumePasswordResetToken(ctx, tokenHash)
	return resetToken{UserID: row.UserID}, err
}

// clearMustChangePassword records that the account is no longer blocked on
// first-login setup. keptDefault distinguishes "chose to keep the default
// password" from "set a real one" — the two need telling apart so an
// unchanged default password can still expire after a week (S1).
func (r *Repository) clearMustChangePassword(ctx context.Context, id uuid.UUID, keptDefault bool) error {
	return r.queries.ClearMustChangePassword(ctx, db.ClearMustChangePasswordParams{ID: id, KeptDefaultPassword: keptDefault})
}

func (r *Repository) revokeResetTokens(ctx context.Context, userID uuid.UUID) error {
	return r.queries.RevokePasswordResetTokens(ctx, userID)
}
