package identity

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type userRepository struct{ queries *db.Queries }

func newUserRepository(pool *pgxpool.Pool) *userRepository {
	return &userRepository{queries: db.New(pool)}
}

func (r *userRepository) ensureExists(ctx context.Context, command ensureUserCommand) (provisionedUser, error) {
	user, err := r.queries.EnsureUserExists(ctx, db.EnsureUserExistsParams{
		ID: command.ID, Email: command.Email, FullName: command.FullName, Role: command.Role,
	})
	if err != nil {
		return provisionedUser{}, err
	}
	return provisionedUser{
		MustChangePassword:  user.MustChangePassword,
		KeptDefaultPassword: user.KeptDefaultPassword,
		CreatedAt:           user.CreatedAt.Time,
		PreferredLanguage:   user.PreferredLanguage,
	}, nil
}

func (r *userRepository) setLanguage(ctx context.Context, id uuid.UUID, language string) error {
	return r.queries.SetUserPreferredLanguage(ctx, db.SetUserPreferredLanguageParams{ID: id, PreferredLanguage: language})
}

func (r *userRepository) listIDs(ctx context.Context) ([]uuid.UUID, error) {
	users, err := r.queries.ListUsers(ctx)
	if err != nil {
		return nil, err
	}

	ids := make([]uuid.UUID, len(users))
	for i, user := range users {
		ids[i] = user.ID
	}
	return ids, nil
}

func (r *userRepository) exists(ctx context.Context, id uuid.UUID) (bool, error) {
	_, err := r.queries.GetUserByID(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}
