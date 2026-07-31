package services

import (
	"context"
	"slices"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/repositories"
)

// appRolePriority mirrors the frontend's role resolution order
// (frontend/src/hooks/useRole.ts) — keep the two in sync if it ever changes.
var appRolePriority = []string{"admin", "teacher", "student", "parent"}

// ResolveAppRole picks the highest-priority OpenSchool role out of the roles
// on a token, or "" if none of them are recognized app roles.
func ResolveAppRole(tokenRoles []string) string {
	for _, candidate := range appRolePriority {
		if slices.Contains(tokenRoles, candidate) {
			return candidate
		}
	}
	return ""
}

type MeService struct {
	repo *repositories.UserRepository
}

func NewMeService(repo *repositories.UserRepository) *MeService {
	return &MeService{repo: repo}
}

// EnsureProvisioned makes sure a local row exists for an identity that just
// authenticated, so first-time sign-ins don't need a separate provisioning
// step. It's a no-op if the token carries no recognized app role — nothing
// meaningful to provision yet.
func (s *MeService) EnsureProvisioned(ctx context.Context, userID uuid.UUID, email, fullName, role string) error {
	if role == "" {
		return nil
	}

	_, err := s.repo.EnsureExists(ctx, db.EnsureUserExistsParams{
		ID:       userID,
		Email:    email,
		FullName: fullName,
		Role:     role,
	})
	return err
}
