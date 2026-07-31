package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/identity"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

var (
	ErrGuardianNotFound           = errors.New("guardian not found")
	ErrGuardianAlreadyProvisioned = errors.New("this guardian already has a portal login")
	ErrGuardianMissingEmail       = errors.New("guardian must have an email on file before provisioning a login")
)

type GuardianService struct {
	repo  *repositories.GuardianRepository
	users *repositories.UserRepository
	idp   identity.Provider
}

func NewGuardianService(repo *repositories.GuardianRepository, users *repositories.UserRepository, idp identity.Provider) *GuardianService {
	return &GuardianService{repo: repo, users: users, idp: idp}
}

func (s *GuardianService) CreateGuardian(ctx context.Context, req models.CreateGuardianRequest) (db.Guardian, error) {
	return s.repo.CreateWithNullable(ctx, req.FullName, req.Relationship, req.Phone, req.Email)
}

func (s *GuardianService) GetGuardian(ctx context.Context, id uuid.UUID) (db.Guardian, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *GuardianService) ListGuardians(ctx context.Context) ([]db.Guardian, error) {
	return s.repo.List(ctx)
}

func (s *GuardianService) UpdateGuardian(ctx context.Context, id uuid.UUID, req models.UpdateGuardianRequest) (db.Guardian, error) {
	return s.repo.UpdateWithNullable(ctx, id, req.FullName, req.Relationship, req.Phone, req.Email)
}

func (s *GuardianService) LinkToStudent(ctx context.Context, studentID uuid.UUID, req models.LinkGuardianRequest) error {
	guardianID, err := uuid.Parse(req.GuardianID)
	if err != nil {
		return fmt.Errorf("invalid guardian id")
	}
	return s.repo.LinkToStudent(ctx, studentID, guardianID, req.IsPrimaryContact)
}

func (s *GuardianService) UnlinkFromStudent(ctx context.Context, studentID uuid.UUID, guardianID uuid.UUID) error {
	return s.repo.UnlinkFromStudent(ctx, studentID, guardianID)
}

func (s *GuardianService) SetPrimaryContact(ctx context.Context, studentID uuid.UUID, guardianID uuid.UUID) error {
	return s.repo.SetPrimaryContact(ctx, studentID, guardianID)
}

func (s *GuardianService) ListByStudent(ctx context.Context, studentID uuid.UUID) ([]db.ListGuardiansByStudentRow, error) {
	return s.repo.ListByStudent(ctx, studentID)
}

// ProvisionLogin creates a ThunderID identity for an existing guardian
// record and links it via guardians.user_id, giving them access to the
// parent portal. Mirrors RegisterFirstAdmin's identity-provisioning flow.
func (s *GuardianService) ProvisionLogin(ctx context.Context, guardianID uuid.UUID, req models.ProvisionGuardianLoginRequest) (db.Guardian, error) {
	guardian, err := s.repo.GetByID(ctx, guardianID)
	if err != nil {
		return db.Guardian{}, ErrGuardianNotFound
	}
	if guardian.UserID.Valid {
		return db.Guardian{}, ErrGuardianAlreadyProvisioned
	}
	if !guardian.Email.Valid || guardian.Email.String == "" {
		return db.Guardian{}, ErrGuardianMissingEmail
	}

	idpUser, err := s.idp.CreateUser(ctx, "parent", map[string]interface{}{
		"username":     req.Username,
		"email":        guardian.Email.String,
		"given_name":   req.GivenName,
		"family_name":  req.FamilyName,
		"phone_number": guardian.Phone,
		"password":     req.Password,
	})
	if err != nil {
		return db.Guardian{}, fmt.Errorf("failed to create identity provider account: %w", err)
	}

	userID, err := uuid.Parse(idpUser.ID)
	if err != nil {
		return db.Guardian{}, fmt.Errorf("invalid identity provider user id: %w", err)
	}

	// guardians.user_id references the local users table, not the identity
	// provider directly — that row normally only appears lazily on first
	// login (see MeHandler), which is too late for the FK this needs now.
	if _, err := s.users.EnsureExists(ctx, db.EnsureUserExistsParams{
		ID:       userID,
		Email:    guardian.Email.String,
		FullName: guardian.FullName,
		Role:     "parent",
	}); err != nil {
		rollbackIDPUser(ctx, s.idp, "ProvisionLogin", idpUser.ID)
		return db.Guardian{}, fmt.Errorf("failed to create local user record: %w", err)
	}

	if err := s.repo.SetUserID(ctx, guardianID, userID); err != nil {
		rollbackIDPUser(ctx, s.idp, "ProvisionLogin", idpUser.ID)
		return db.Guardian{}, fmt.Errorf("failed to link guardian record: %w", err)
	}

	if err := s.idp.AssignRole(ctx, identity.RoleID("parent"), idpUser.ID); err != nil {
		return db.Guardian{}, fmt.Errorf("failed to assign parent role: %w", err)
	}

	return s.repo.GetByID(ctx, guardianID)
}

func (s *GuardianService) GetChildrenForUser(ctx context.Context, userID uuid.UUID) ([]db.ListStudentsByGuardianUserIDRow, error) {
	return s.repo.ListStudentsByGuardianUserID(ctx, userID)
}

func (s *GuardianService) IsGuardianOfStudent(ctx context.Context, userID uuid.UUID, studentID uuid.UUID) (bool, error) {
	return s.repo.IsGuardianOfStudent(ctx, userID, studentID)
}
