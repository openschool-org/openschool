package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/identity"
	"github.com/openschool-org/openschool/internal/models"
	notificationsmodels "github.com/openschool-org/openschool/internal/models/notifications"
	"github.com/openschool-org/openschool/internal/repositories"
	notificationsservices "github.com/openschool-org/openschool/internal/services/notifications"
)

var (
	ErrGuardianNotFound           = errors.New("guardian not found")
	ErrGuardianAlreadyProvisioned = errors.New("this guardian already has a portal login")
	ErrGuardianMissingEmail       = errors.New("guardian must have an email on file before provisioning a login")
	ErrGuardianMissingNIC         = errors.New("guardian must have an NIC number on file before provisioning a login")
	ErrGuardianInUse              = errors.New("guardian is linked to a student — unlink them first")
)

type GuardianService struct {
	repo          *repositories.GuardianRepository
	users         *repositories.UserRepository
	idp           identity.Provider
	notifications *notificationsservices.NotificationService
	audit         *AuditService
}

func NewGuardianService(repo *repositories.GuardianRepository, users *repositories.UserRepository, idp identity.Provider, notifications *notificationsservices.NotificationService, audit *AuditService) *GuardianService {
	return &GuardianService{repo: repo, users: users, idp: idp, notifications: notifications, audit: audit}
}

// CreateGuardian creates a new guardian record and also returns any existing guardians sharing the same phone/email — a soft duplicate warning, never a hard block (e.g. a shared home phone is legitimate).
func (s *GuardianService) CreateGuardian(ctx context.Context, req models.CreateGuardianRequest) (db.Guardian, []db.Guardian, error) {
	duplicates, err := s.repo.FindDuplicateCandidates(ctx, req.Phone, req.Email)
	if err != nil {
		return db.Guardian{}, nil, err
	}
	guardian, err := s.repo.CreateWithNullable(ctx, req.FullName, req.Relationship, req.Phone, req.Email, req.NICNumber)
	if err != nil {
		return db.Guardian{}, nil, err
	}
	return guardian, duplicates, nil
}

func (s *GuardianService) GetGuardian(ctx context.Context, id uuid.UUID) (db.Guardian, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *GuardianService) ListGuardians(ctx context.Context, search string, orphansOnly bool) ([]db.Guardian, error) {
	return s.repo.List(ctx, search, orphansOnly)
}

func (s *GuardianService) ListStudentsFor(ctx context.Context, guardianID uuid.UUID) ([]db.StudentProfile, error) {
	return s.repo.ListStudentsByGuardianID(ctx, guardianID)
}

// DeleteGuardian removes a guardian record outright; blocked while linked to any student, since silently cascading would remove a shared guardian from every child at once.
func (s *GuardianService) DeleteGuardian(ctx context.Context, id uuid.UUID, actorID uuid.UUID) error {
	before, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return ErrGuardianNotFound
	}

	rows, err := s.repo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrGuardianInUse
	}

	if s.audit != nil {
		_ = s.audit.Record(ctx, "guardian_account", id, "account_deleted", actorID, before, nil, "")
	}
	return nil
}

// ListNotifications returns the notification history for a guardian's portal account (empty if they don't have one) — for the directory's "notification history" panel.
func (s *GuardianService) ListNotifications(ctx context.Context, guardianID uuid.UUID) ([]notificationsmodels.MyNotificationResponse, error) {
	guardian, err := s.repo.GetByID(ctx, guardianID)
	if err != nil {
		return nil, err
	}
	if !guardian.UserID.Valid {
		return []notificationsmodels.MyNotificationResponse{}, nil
	}
	return s.notifications.ListMine(ctx, uuid.UUID(guardian.UserID.Bytes))
}

func (s *GuardianService) UpdateGuardian(ctx context.Context, id uuid.UUID, req models.UpdateGuardianRequest) (db.Guardian, error) {
	return s.repo.UpdateWithNullable(ctx, id, req.FullName, req.Relationship, req.Phone, req.Email, req.NICNumber)
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

// ProvisionLogin creates a ThunderID identity for an existing guardian and links it via guardians.user_id, giving them access to the parent portal — mirrors RegisterFirstAdmin's provisioning flow.
func (s *GuardianService) ProvisionLogin(ctx context.Context, guardianID uuid.UUID, req models.ProvisionGuardianLoginRequest, actorID uuid.UUID) (db.Guardian, error) {
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
	if guardian.NicNumber == "" {
		return db.Guardian{}, ErrGuardianMissingNIC
	}

	// The guardian's NIC number (already on file, Phase 8.1) becomes their
	// initial (one-time) portal password (Phase 8.2) — there is no separate
	// manual password entry anymore.
	idpUser, err := s.idp.CreateUser(ctx, models.RoleParent, map[string]interface{}{
		"username":    req.Username,
		"email":       guardian.Email.String,
		"given_name":  req.GivenName,
		"family_name": req.FamilyName,
		"phone":       guardian.Phone,
		"password":    guardian.NicNumber,
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
		ID:                 userID,
		Email:              guardian.Email.String,
		FullName:           guardian.FullName,
		Role:               models.RoleParent,
		MustChangePassword: true,
	}); err != nil {
		rollbackIDPUser(ctx, s.idp, "ProvisionLogin", idpUser.ID)
		return db.Guardian{}, fmt.Errorf("failed to create local user record: %w", err)
	}

	if err := s.repo.SetUserID(ctx, guardianID, userID); err != nil {
		rollbackIDPUser(ctx, s.idp, "ProvisionLogin", idpUser.ID)
		return db.Guardian{}, fmt.Errorf("failed to link guardian record: %w", err)
	}

	if err := s.idp.AssignRole(ctx, identity.RoleID(models.RoleParent), idpUser.ID); err != nil {
		return db.Guardian{}, fmt.Errorf("failed to assign parent role: %w", err)
	}

	if s.audit != nil {
		_ = s.audit.Record(ctx, "guardian_account", guardianID, "login_provisioned", actorID, nil, struct {
			UserID uuid.UUID `json:"user_id"`
		}{userID}, "")
	}

	return s.repo.GetByID(ctx, guardianID)
}

func (s *GuardianService) GetChildrenForUser(ctx context.Context, userID uuid.UUID) ([]db.ListStudentsByGuardianUserIDRow, error) {
	return s.repo.ListStudentsByGuardianUserID(ctx, userID)
}

func (s *GuardianService) IsGuardianOfStudent(ctx context.Context, userID uuid.UUID, studentID uuid.UUID) (bool, error) {
	return s.repo.IsGuardianOfStudent(ctx, userID, studentID)
}
