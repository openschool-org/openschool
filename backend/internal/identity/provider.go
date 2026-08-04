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
}

type Provider interface {
	CreateUser(ctx context.Context, userType string, attrs map[string]any) (*User, error)
	UpdateUser(ctx context.Context, userID string, userType string, attrs map[string]any) error
	DeleteUser(ctx context.Context, userID string) error
	AssignRole(ctx context.Context, roleID string, userID string) error
}

func JWKSURL() string {
	return os.Getenv("THUNDERID_JWKS_URL")
}

func Issuer() string {
	return os.Getenv("THUNDERID_ISSUER")
}

func RoleID(role string) string {
	return os.Getenv("THUNDERID_ROLE_" + strings.ToUpper(role))
}
