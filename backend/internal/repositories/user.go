package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type UserRepository struct {
	queries *db.Queries
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{queries: db.New(pool)}
}

func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (db.User, error) {
	return r.queries.GetUserByID(ctx, id)
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (db.User, error) {
	return r.queries.GetUserByEmail(ctx, email)
}

func (r *UserRepository) Create(ctx context.Context, arg db.CreateUserParams) (db.User, error) {
	return r.queries.CreateUser(ctx, arg)
}

func (r *UserRepository) EnsureExists(ctx context.Context, arg db.EnsureUserExistsParams) (db.User, error) {
	return r.queries.EnsureUserExists(ctx, arg)
}

func (r *UserRepository) CountByRole(ctx context.Context, role string) (int64, error) {
	return r.queries.CountUsersByRole(ctx, role)
}

func (r *UserRepository) List(ctx context.Context) ([]db.User, error) {
	return r.queries.ListUsers(ctx)
}

func (r *UserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteUser(ctx, id)
}

func (r *UserRepository) SetMustChangePassword(ctx context.Context, id uuid.UUID, mustChange bool) error {
	return r.queries.SetMustChangePassword(ctx, db.SetMustChangePasswordParams{
		ID:                 id,
		MustChangePassword: mustChange,
	})
}
