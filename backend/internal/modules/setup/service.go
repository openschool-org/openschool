// Package setup owns the one-time first-admin bootstrap workflow.
package setup

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/idp"
)

var ErrAlreadyDone = errors.New("setup already completed")

type AdminUser struct {
	ID    uuid.UUID
	Email string
}

type store interface {
	countUsersByRole(context.Context, string) (int64, error)
	createAdmin(context.Context, uuid.UUID, string, string) (AdminUser, error)
	deleteUser(context.Context, uuid.UUID) error
}

type Service struct {
	store store
	idp   idp.Provider
}

func NewService(store store, idp idp.Provider) *Service {
	return &Service{store: store, idp: idp}
}

func (s *Service) NeedsSetup(ctx context.Context) (bool, error) {
	count, err := s.store.countUsersByRole(ctx, authz.RoleAdmin)
	if err != nil {
		return false, err
	}
	return count == 0, nil
}

func (s *Service) RegisterFirstAdmin(ctx context.Context, req RegisterAdminRequest) (AdminUser, error) {
	needsSetup, err := s.NeedsSetup(ctx)
	if err != nil {
		return AdminUser{}, err
	}
	if !needsSetup {
		return AdminUser{}, ErrAlreadyDone
	}

	idpUser, err := s.idp.CreateUser(ctx, authz.RoleAdmin, map[string]interface{}{
		"username": req.Username, "email": req.Email, "given_name": req.GivenName,
		"family_name": req.FamilyName, "phone_number": req.PhoneNumber, "password": req.Password,
	})
	if err != nil {
		return AdminUser{}, fmt.Errorf("failed to create identity provider account: %w", err)
	}

	userID, err := uuid.Parse(idpUser.ID)
	if err != nil {
		return AdminUser{}, fmt.Errorf("invalid identity provider user id: %w", err)
	}

	// createAdmin re-checks under a database lock; the loser of a race
	// removes the identity provider account it just made.
	user, err := s.store.createAdmin(ctx, userID, req.Email, req.GivenName+" "+req.FamilyName)
	if errors.Is(err, ErrAlreadyDone) {
		s.rollbackIDPUser(ctx, idpUser.ID)
		return AdminUser{}, ErrAlreadyDone
	}
	if err != nil {
		s.rollbackIDPUser(ctx, idpUser.ID)
		return AdminUser{}, fmt.Errorf("failed to create user record: %w", err)
	}

	if err := s.idp.AssignRole(ctx, idp.RoleID(authz.RoleAdmin), idpUser.ID); err != nil {
		if deleteErr := s.store.deleteUser(ctx, userID); deleteErr != nil {
			log.Printf("RegisterFirstAdmin: failed to roll back local user row %s: %v (local admin row now orphaned, instance may be unbootstrappable)", userID, deleteErr)
		}
		s.rollbackIDPUser(ctx, idpUser.ID)
		return AdminUser{}, fmt.Errorf("failed to assign admin role: %w", err)
	}

	return user, nil
}

func (s *Service) rollbackIDPUser(ctx context.Context, userID string) {
	// Its own deadline: the request's may already be spent by the time a rollback runs.
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 10*time.Second)
	defer cancel()
	if err := s.idp.DeleteUser(ctx, userID); err != nil {
		log.Printf("RegisterFirstAdmin: failed to roll back identity provider user %s: %v (identity provider account now orphaned)", userID, err)
	}
}
