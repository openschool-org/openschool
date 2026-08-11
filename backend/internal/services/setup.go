package services

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/identity"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

// ErrSetupAlreadyDone is returned once an admin exists — first-run
// registration must never be reachable again after that point.
var ErrSetupAlreadyDone = errors.New("setup already completed")

type SetupService struct {
	repo *repositories.UserRepository
	idp  identity.Provider
}

func NewSetupService(repo *repositories.UserRepository, idp identity.Provider) *SetupService {
	return &SetupService{repo: repo, idp: idp}
}

func (s *SetupService) NeedsSetup(ctx context.Context) (bool, error) {
	count, err := s.repo.CountByRole(ctx, "admin")
	if err != nil {
		return false, err
	}
	return count == 0, nil
}

func (s *SetupService) RegisterFirstAdmin(ctx context.Context, req models.RegisterAdminRequest) (db.User, error) {
	needsSetup, err := s.NeedsSetup(ctx)
	if err != nil {
		return db.User{}, err
	}
	if !needsSetup {
		return db.User{}, ErrSetupAlreadyDone
	}

	idpUser, err := s.idp.CreateUser(ctx, "admin", map[string]interface{}{
		"username":     req.Username,
		"email":        req.Email,
		"given_name":   req.GivenName,
		"family_name":  req.FamilyName,
		"phone_number": req.PhoneNumber,
		"password":     req.Password,
	})
	if err != nil {
		return db.User{}, fmt.Errorf("failed to create identity provider account: %w", err)
	}

	userID, err := uuid.Parse(idpUser.ID)
	if err != nil {
		return db.User{}, fmt.Errorf("invalid identity provider user id: %w", err)
	}

	// Re-check under the same guard right before the write: closes most of
	// the race between two first-run submissions racing the initial check.
	needsSetup, err = s.NeedsSetup(ctx)
	if err != nil {
		return db.User{}, err
	}
	if !needsSetup {
		rollbackIDPUser(ctx, s.idp, "RegisterFirstAdmin", idpUser.ID)
		return db.User{}, ErrSetupAlreadyDone
	}

	fullName := req.GivenName + " " + req.FamilyName

	user, err := s.repo.Create(ctx, db.CreateUserParams{
		ID:       userID,
		Email:    req.Email,
		FullName: fullName,
		Role:     "admin",
	})
	if err != nil {
		rollbackIDPUser(ctx, s.idp, "RegisterFirstAdmin", idpUser.ID)
		return db.User{}, fmt.Errorf("failed to create user record: %w", err)
	}

	if err := s.idp.AssignRole(ctx, identity.RoleID("admin"), idpUser.ID); err != nil {
		// Unlike every earlier failure branch in this function, this one runs
		// after the local admin row already exists — NeedsSetup() would
		// otherwise report false forever, permanently locking /setup behind a
		// user who can never actually sign in (no role on their IDP account).
		if delErr := s.repo.Delete(ctx, userID); delErr != nil {
			log.Printf("RegisterFirstAdmin: failed to roll back local user row %s: %v (local admin row now orphaned, instance may be unbootstrappable)", userID, delErr)
		}
		rollbackIDPUser(ctx, s.idp, "RegisterFirstAdmin", idpUser.ID)
		return db.User{}, fmt.Errorf("failed to assign admin role: %w", err)
	}

	return user, nil
}
