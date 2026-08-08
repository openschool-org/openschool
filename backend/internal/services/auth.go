package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/identity"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

var (
	// ErrInvalidCredentials is returned for both "no such account" and "secret
	// didn't match" — never distinguished in the response, so a ForgotPassword
	// call can't be used to enumerate which identifiers exist.
	ErrInvalidCredentials = errors.New("no account matches those details")
	ErrResetTokenInvalid  = errors.New("reset link is invalid, already used, or has expired")
)

// passwordResetTokenTTL is short since, unlike a normal emailed reset link,
// the token is handed straight back to the same client that just verified
// its own identity — it only needs to survive the handoff into the next
// screen of the same flow.
const passwordResetTokenTTL = 15 * time.Minute

type AuthService struct {
	users     *repositories.UserRepository
	teachers  *repositories.TeacherRepository
	students  *repositories.StudentRepository
	guardians *repositories.GuardianRepository
	tokens    *repositories.AuthRepository
	idp       identity.Provider
}

func NewAuthService(
	users *repositories.UserRepository,
	teachers *repositories.TeacherRepository,
	students *repositories.StudentRepository,
	guardians *repositories.GuardianRepository,
	tokens *repositories.AuthRepository,
	idp identity.Provider,
) *AuthService {
	return &AuthService{users: users, teachers: teachers, students: students, guardians: guardians, tokens: tokens, idp: idp}
}

// ForgotPassword verifies the caller knows both a user's login identifier
// (email) and the secret that matches their initial default password
// (Phase 8.2), then mints a short-lived one-time token for ResetPassword.
// ThunderID exposes no reset primitive itself (confirmed — identity.Provider
// is CreateUser/UpdateUser/DeleteUser/AssignRole only), so this whole flow —
// including the token — is hand-rolled at the app level.
func (s *AuthService) ForgotPassword(ctx context.Context, req models.ForgotPasswordRequest) (models.ForgotPasswordResponse, error) {
	user, err := s.users.GetByEmail(ctx, req.Identifier)
	if err != nil || user.Role != req.Role {
		return models.ForgotPasswordResponse{}, ErrInvalidCredentials
	}

	switch req.Role {
	case "teacher":
		if _, err := s.teachers.GetByUserIDAndNIC(ctx, user.ID, req.Secret); err != nil {
			return models.ForgotPasswordResponse{}, ErrInvalidCredentials
		}
	case "student":
		student, err := s.students.GetByUserID(ctx, user.ID)
		if err != nil || student.IndexNumber != req.Secret {
			return models.ForgotPasswordResponse{}, ErrInvalidCredentials
		}
	case "parent":
		if _, err := s.guardians.GetByUserIDAndNIC(ctx, user.ID, req.Secret); err != nil {
			return models.ForgotPasswordResponse{}, ErrInvalidCredentials
		}
	default:
		// Unreachable — models.ForgotPasswordRequest.Role is already
		// constrained to teacher/student/parent by its binding tag.
		return models.ForgotPasswordResponse{}, ErrInvalidCredentials
	}

	return s.issueResetToken(ctx, user.ID)
}

func (s *AuthService) issueResetToken(ctx context.Context, userID uuid.UUID) (models.ForgotPasswordResponse, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return models.ForgotPasswordResponse{}, fmt.Errorf("failed to generate reset token: %w", err)
	}
	token := hex.EncodeToString(raw)
	hash := hashResetToken(token)
	expiresAt := time.Now().Add(passwordResetTokenTTL)

	if _, err := s.tokens.CreatePasswordResetToken(ctx, userID, hash, expiresAt); err != nil {
		return models.ForgotPasswordResponse{}, fmt.Errorf("failed to create reset token: %w", err)
	}

	return models.ForgotPasswordResponse{ResetToken: token, ExpiresAt: expiresAt.Format(time.RFC3339)}, nil
}

// ResetPassword is the unauthenticated counterpart to ChangePassword — it
// trusts the one-time token from ForgotPassword instead of a JWT.
func (s *AuthService) ResetPassword(ctx context.Context, req models.ResetPasswordRequest) error {
	record, err := s.tokens.GetPasswordResetTokenByHash(ctx, hashResetToken(req.Token))
	if err != nil {
		return ErrResetTokenInvalid
	}
	if record.UsedAt.Valid || time.Now().After(record.ExpiresAt.Time) {
		return ErrResetTokenInvalid
	}

	if err := s.setPassword(ctx, record.UserID, req.NewPassword); err != nil {
		return err
	}

	return s.tokens.MarkPasswordResetTokenUsed(ctx, record.ID)
}

// ChangePassword is used by an already-authenticated caller: the "Change
// password" profile action, and the first-login "Set a new password"
// choice (Phase 8.3) — both already have a verified session, so no reset
// token is needed.
func (s *AuthService) ChangePassword(ctx context.Context, userID uuid.UUID, newPassword string) error {
	return s.setPassword(ctx, userID, newPassword)
}

// KeepDefaultPassword clears the must-change flag without touching the
// password — the first-login "Keep this password" choice (Phase 8.3).
func (s *AuthService) KeepDefaultPassword(ctx context.Context, userID uuid.UUID) error {
	return s.users.SetMustChangePassword(ctx, userID, false)
}

func (s *AuthService) setPassword(ctx context.Context, userID uuid.UUID, newPassword string) error {
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	if err := s.idp.UpdateUser(ctx, userID.String(), user.Role, map[string]interface{}{
		"password": newPassword,
	}); err != nil {
		return fmt.Errorf("failed to update identity provider password: %w", err)
	}

	return s.users.SetMustChangePassword(ctx, userID, false)
}

func hashResetToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
