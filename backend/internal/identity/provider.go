package identity

import (
	"context"
	"errors"
	"os"
	"strings"
)

// ErrDuplicateUser is returned by Provider.CreateUser when the identity
// provider rejects the account because a unique attribute (email, username,
// phone, etc.) is already taken by another account.
var ErrDuplicateUser = errors.New("a user with these details already exists")

type User struct {
	ID string
	// Username/Email are best-effort, extracted from whatever attributes
	// the identity provider returned for this user (may be empty) — used
	// only for display in the orphaned-account reconciliation view, never
	// for authorization decisions.
	Username string
	Email    string
}

type Provider interface {
	CreateUser(ctx context.Context, userType string, attrs map[string]any) (*User, error)
	UpdateUser(ctx context.Context, userID string, userType string, attrs map[string]any) error
	DeleteUser(ctx context.Context, userID string) error
	AssignRole(ctx context.Context, roleID string, userID string) error
	// ListUsers returns every user account the identity provider knows
	// about, across all pages. Used by the orphaned-identity reconciliation
	// job (docs/plan.md §0) to find accounts with no matching local `users`
	// row — the compensating delete in a signup rollback only logs on
	// failure, so this is the recovery path when that happens.
	ListUsers(ctx context.Context) ([]User, error)
}

func JWKSURL() string {
	return os.Getenv("THUNDERID_JWKS_URL")
}

func Issuer() string {
	return os.Getenv("THUNDERID_ISSUER")
}

// Audience returns the expected `aud` claim on end-user access tokens (the
// frontend SPA's OAuth client id), if configured. Empty means audience
// validation is skipped — see the caller in middleware/auth.go.
func Audience() string {
	return os.Getenv("THUNDERID_AUDIENCE")
}

func RoleID(role string) string {
	return os.Getenv("THUNDERID_ROLE_" + strings.ToUpper(role))
}
