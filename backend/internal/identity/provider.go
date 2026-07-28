package identity

import (
	"context"
	"os"
	"strings"
)

type User struct {
	ID string
}

type Provider interface {
	CreateUser(ctx context.Context, userType string, attrs map[string]any) (*User, error)
	UpdateUser(ctx context.Context, userID string, userType string, attrs map[string]any) error
	DeleteUser(ctx context.Context, userID string) error
	AssignRole(ctx context.Context, roleID string, userID string) error
}

func Selected() string {
	if os.Getenv("IDP_PROVIDER") == "thunderid" {
		return "thunderid"
	}
	return "asgardeo"
}

func JWKSURL() string {
	if Selected() == "thunderid" {
		return os.Getenv("THUNDERID_JWKS_URL")
	}
	return os.Getenv("ASGARDEO_JWKS_URL")
}

func Issuer() string {
	if Selected() == "thunderid" {
		return os.Getenv("THUNDERID_ISSUER")
	}
	return os.Getenv("ASGARDEO_ISSUER")
}

func RoleID(role string) string {
	prefix := "ASGARDEO_ROLE_"
	if Selected() == "thunderid" {
		prefix = "THUNDERID_ROLE_"
	}
	return os.Getenv(prefix + strings.ToUpper(role))
}
