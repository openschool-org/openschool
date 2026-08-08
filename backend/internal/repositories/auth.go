package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type AuthRepository struct {
	queries *db.Queries
}

func NewAuthRepository(pool *pgxpool.Pool) *AuthRepository {
	return &AuthRepository{queries: db.New(pool)}
}

func (r *AuthRepository) CreatePasswordResetToken(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) (db.PasswordResetToken, error) {
	return r.queries.CreatePasswordResetToken(ctx, db.CreatePasswordResetTokenParams{
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: pgtype.Timestamptz{Time: expiresAt, Valid: true},
	})
}

func (r *AuthRepository) GetPasswordResetTokenByHash(ctx context.Context, tokenHash string) (db.PasswordResetToken, error) {
	return r.queries.GetPasswordResetTokenByHash(ctx, tokenHash)
}

func (r *AuthRepository) MarkPasswordResetTokenUsed(ctx context.Context, id uuid.UUID) error {
	return r.queries.MarkPasswordResetTokenUsed(ctx, id)
}
