package setup

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/authz"
)

type Repository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool, queries: db.New(pool)}
}

func (r *Repository) countUsersByRole(ctx context.Context, role string) (int64, error) {
	return r.queries.CountUsersByRole(ctx, role)
}

// createAdmin inserts the first admin only if none exists yet. The count and
// insert run under one transaction-scoped advisory lock, so two setups racing
// cannot both create an admin (S7). ErrAlreadyDone means another one won.
func (r *Repository) createAdmin(ctx context.Context, id uuid.UUID, email, fullName string) (AdminUser, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return AdminUser{}, err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext('openschool.first_admin'))"); err != nil {
		return AdminUser{}, err
	}
	q := r.queries.WithTx(tx)
	count, err := q.CountUsersByRole(ctx, authz.RoleAdmin)
	if err != nil {
		return AdminUser{}, err
	}
	if count > 0 {
		return AdminUser{}, ErrAlreadyDone
	}
	user, err := q.CreateUser(ctx, db.CreateUserParams{ID: id, Email: email, FullName: fullName, Role: authz.RoleAdmin})
	if err != nil {
		return AdminUser{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return AdminUser{}, err
	}
	return AdminUser{ID: user.ID, Email: user.Email}, nil
}

func (r *Repository) deleteUser(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteUser(ctx, id)
}
