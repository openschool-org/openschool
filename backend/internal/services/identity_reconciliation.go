package services

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/identity"
	"github.com/openschool-org/openschool/internal/repositories"
)

// ErrOrphanNoLongerOrphaned is returned by DeleteOrphaned when the account now has a matching local `users` row — the delete is refused rather than proceeding.
var ErrOrphanNoLongerOrphaned = errors.New("this identity provider account now has a matching local user — refusing to delete")

// OrphanedIdentity is a ThunderID account with no matching local `users` row — left behind when a signup rollback's compensating ThunderID delete failed (identity_rollback.go's rollbackIDPUser only logs on that failure, by design).
type OrphanedIdentity struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

// IdentityReconciliationService finds and removes orphaned ThunderID accounts; admin-triggered rather than automatic, since deleting a live identity account needs a human confirming it's genuinely orphaned and not, say, a signup still in flight.
type IdentityReconciliationService struct {
	idp   identity.Provider
	users *repositories.UserRepository
	audit *AuditService
}

func NewIdentityReconciliationService(idp identity.Provider, users *repositories.UserRepository, audit *AuditService) *IdentityReconciliationService {
	return &IdentityReconciliationService{idp: idp, users: users, audit: audit}
}

// FindOrphaned lists every ThunderID account with no matching local `users`
// row.
func (s *IdentityReconciliationService) FindOrphaned(ctx context.Context) ([]OrphanedIdentity, error) {
	idpUsers, err := s.idp.ListUsers(ctx)
	if err != nil {
		return nil, err
	}

	localUsers, err := s.users.List(ctx)
	if err != nil {
		return nil, err
	}

	localIDs := make(map[string]struct{}, len(localUsers))
	for _, u := range localUsers {
		localIDs[u.ID.String()] = struct{}{}
	}

	orphaned := make([]OrphanedIdentity, 0)
	for _, u := range idpUsers {
		if _, exists := localIDs[u.ID]; !exists {
			orphaned = append(orphaned, OrphanedIdentity{ID: u.ID, Username: u.Username, Email: u.Email})
		}
	}
	return orphaned, nil
}

// DeleteOrphaned removes one confirmed-orphaned ThunderID account, re-checking it's still orphaned immediately before deleting — defends against an admin acting on a stale list (e.g. a second tab open since legitimate provisioning).
func (s *IdentityReconciliationService) DeleteOrphaned(ctx context.Context, idpUserID string, actorID uuid.UUID) error {
	if parsed, err := uuid.Parse(idpUserID); err == nil {
		if _, err := s.users.GetByID(ctx, parsed); err == nil {
			return ErrOrphanNoLongerOrphaned
		}
	}

	if err := s.idp.DeleteUser(ctx, idpUserID); err != nil {
		return err
	}

	if s.audit != nil {
		_ = s.audit.Record(ctx, "orphaned_identity", uuid.Nil, "deleted", actorID, OrphanedIdentity{ID: idpUserID}, nil, "")
	}
	return nil
}
