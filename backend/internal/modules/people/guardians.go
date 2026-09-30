package people

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/idp"
	"github.com/openschool-org/openschool/internal/ports"
	"github.com/openschool-org/openschool/internal/validation"
)

var (
	ErrGuardianNotFound           = errors.New("guardian not found")
	ErrGuardianAlreadyProvisioned = errors.New("this guardian already has a portal login")
	ErrGuardianMissingEmail       = errors.New("guardian must have an email on file before provisioning a login")
	ErrGuardianMissingNIC         = errors.New("guardian must have an NIC number on file before provisioning a login")
	ErrGuardianInUse              = errors.New("guardian is linked to a student — unlink them first")
)

type guardianRecord struct {
	ID       uuid.UUID
	UserID   *uuid.UUID
	FullName string
	Email    string
	Phone    string
	NIC      string
}

type guardianStore interface {
	guardian(context.Context, uuid.UUID) (guardianRecord, error)
	guardianDuplicates(context.Context, string, string) (any, error)
	createGuardian(context.Context, CreateGuardianRequest) (any, error)
	updateGuardian(context.Context, uuid.UUID, UpdateGuardianRequest) (any, error)
	deleteGuardian(context.Context, uuid.UUID) (int64, error)
	linkGuardian(context.Context, uuid.UUID, uuid.UUID, bool) error
	unlinkGuardian(context.Context, uuid.UUID, uuid.UUID) error
	setPrimaryGuardian(context.Context, uuid.UUID, uuid.UUID) error
	ensureParentUser(context.Context, uuid.UUID, string, string) error
	deleteGuardianUser(context.Context, uuid.UUID) error
	setGuardianUser(context.Context, uuid.UUID, uuid.UUID) error
	guardianResponse(context.Context, uuid.UUID) (any, error)
}

type GuardianService struct {
	store guardianStore
	idp   idp.Provider
	audit ports.AuditRecorder
}

func NewGuardianService(store guardianStore, idp idp.Provider, audit ports.AuditRecorder) *GuardianService {
	return &GuardianService{store: store, idp: idp, audit: audit}
}

func (s *GuardianService) Create(ctx context.Context, req CreateGuardianRequest) (any, any, error) {
	if !validation.NormalizePhoneField(&req.Phone) {
		return nil, nil, validation.ErrInvalidPhone
	}
	duplicates, err := s.store.guardianDuplicates(ctx, req.Phone, req.Email)
	if err != nil {
		return nil, nil, err
	}
	guardian, err := s.store.createGuardian(ctx, req)
	return guardian, duplicates, err
}

func (s *GuardianService) Update(ctx context.Context, id uuid.UUID, req UpdateGuardianRequest) (any, error) {
	if !validation.NormalizePhoneField(&req.Phone) {
		return nil, validation.ErrInvalidPhone
	}
	return s.store.updateGuardian(ctx, id, req)
}

func (s *GuardianService) Delete(ctx context.Context, id, actor uuid.UUID) error {
	before, err := s.store.guardian(ctx, id)
	if err != nil {
		return ErrGuardianNotFound
	}
	rows, err := s.store.deleteGuardian(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrGuardianInUse
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "guardian_account", id, "account_deleted", actor, before, nil, "")
	}
	return nil
}

func (s *GuardianService) Link(ctx context.Context, student uuid.UUID, req LinkGuardianRequest) error {
	guardian, err := uuid.Parse(req.GuardianID)
	if err != nil {
		return errors.New("invalid guardian id")
	}
	return s.store.linkGuardian(ctx, student, guardian, req.IsPrimaryContact)
}

func (s *GuardianService) Unlink(ctx context.Context, student, guardian uuid.UUID) error {
	return s.store.unlinkGuardian(ctx, student, guardian)
}

func (s *GuardianService) SetPrimary(ctx context.Context, student, guardian uuid.UUID) error {
	return s.store.setPrimaryGuardian(ctx, student, guardian)
}

func (s *GuardianService) Provision(ctx context.Context, id uuid.UUID, req ProvisionGuardianLoginRequest, actor uuid.UUID) (any, error) {
	guardian, err := s.store.guardian(ctx, id)
	if err != nil {
		return nil, ErrGuardianNotFound
	}
	if guardian.UserID != nil {
		return nil, ErrGuardianAlreadyProvisioned
	}
	if guardian.Email == "" {
		return nil, ErrGuardianMissingEmail
	}
	if guardian.NIC == "" {
		return nil, ErrGuardianMissingNIC
	}

	idpUser, err := s.idp.CreateUser(ctx, authz.RoleParent, map[string]any{
		"username": req.Username, "email": guardian.Email, "given_name": req.GivenName,
		"family_name": req.FamilyName, "phone": guardian.Phone, "password": guardian.NIC,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create identity provider account: %w", err)
	}
	userID, err := uuid.Parse(idpUser.ID)
	if err != nil {
		return nil, fmt.Errorf("invalid identity provider user id: %w", err)
	}
	if err := s.store.ensureParentUser(ctx, userID, guardian.Email, guardian.FullName); err != nil {
		s.rollbackIdentity(ctx, idpUser.ID)
		return nil, fmt.Errorf("failed to create local user record: %w", err)
	}
	if err := s.idp.AssignRole(ctx, idp.RoleID(authz.RoleParent), idpUser.ID); err != nil {
		s.rollbackWithCleanup(idpUser.ID, userID)
		return nil, fmt.Errorf("failed to assign parent role: %w", err)
	}
	if err := s.store.setGuardianUser(ctx, id, userID); err != nil {
		s.rollbackWithCleanup(idpUser.ID, userID)
		return nil, fmt.Errorf("failed to link guardian record: %w", err)
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "guardian_account", id, "login_provisioned", actor, nil, struct {
			UserID uuid.UUID `json:"user_id"`
		}{userID}, "")
	}
	return s.store.guardianResponse(ctx, id)
}

func (s *GuardianService) rollback(ctx context.Context, idpID string, userID uuid.UUID) {
	s.rollbackIdentity(ctx, idpID)
	if err := s.store.deleteGuardianUser(ctx, userID); err != nil {
		log.Printf("ProvisionLogin: failed to roll back local user row %s: %v", userID, err)
	}
}

func (s *GuardianService) rollbackIdentity(ctx context.Context, idpID string) {
	if err := s.idp.DeleteUser(ctx, idpID); err != nil {
		log.Printf("ProvisionLogin: failed to roll back identity user %s: %v", idpID, err)
	}
}

func (s *GuardianService) rollbackWithCleanup(idpID string, userID uuid.UUID) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	s.rollback(ctx, idpID, userID)
}
