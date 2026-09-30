// Package mail serves the admin email screen and supplies school branding to the email templates.
package mail

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/emails"
)

// Repository is the mail module's only sqlc adapter.
type Repository struct {
	queries *db.Queries
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{queries: db.New(pool)}
}

// Branding reads the school's name and contact details; before first-run setup there is no school yet.
func (r *Repository) Branding(ctx context.Context) (emails.Branding, error) {
	school, err := r.queries.GetSchool(ctx)
	if errors.Is(err, pgx.ErrNoRows) {
		return emails.Branding{}, nil
	}
	if err != nil {
		return emails.Branding{}, err
	}
	return emails.Branding{SchoolName: school.Name, Phone: school.Phone.String, Email: school.Email.String}, nil
}

func (r *Repository) userEmail(ctx context.Context, id uuid.UUID) (string, error) {
	user, err := r.queries.GetUserByID(ctx, id)
	return user.Email, err
}
