// Package auth owns OpenSchool's password lifecycle and ThunderID password updates.
package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/mailer"
	"github.com/openschool-org/openschool/internal/ports"
)

var (
	// ErrInvalidCredentials is returned for both "no such account" and "secret
	// didn't match" — never distinguished in the response, so a ForgotPassword
	// call can't be used to enumerate which identifiers exist.
	ErrInvalidCredentials = errors.New("no account matches those details")
	ErrResetTokenInvalid  = errors.New("reset link is invalid, already used, or has expired")
	// ErrDefaultPasswordExpired is returned when "keep this password" is no
	// longer available and the account must set a real password (S1).
	ErrDefaultPasswordExpired = errors.New("this account has kept its default password for too long — set a new password to continue")
	// ErrPasswordAlreadyChanged is returned when KeepDefaultPassword is
	// called on an account that has already set a real password.
	ErrPasswordAlreadyChanged = errors.New("this account has already set a password")
)

// passwordResetTokenTTL bounds how long an emailed reset link stays valid.
const passwordResetTokenTTL = 15 * time.Minute

type authStore interface {
	userByEmail(context.Context, string) (userAccount, error)
	userByID(context.Context, uuid.UUID) (userAccount, error)
	teacherCredentialsMatch(context.Context, uuid.UUID, string) bool
	studentCredentialsMatch(context.Context, uuid.UUID, string) bool
	createResetToken(context.Context, uuid.UUID, string, time.Time) error
	consumeResetToken(context.Context, string) (resetToken, error)
	clearMustChangePassword(ctx context.Context, id uuid.UUID, keptDefault bool) error
}

// DefaultPasswordExpiry bounds how long a "keep this password" choice
// stands before the default password is treated as expired again (S1):
// the initial password is the NIC or index number, both printed on
// documents other students see, so letting that choice stand forever
// would leave the account exactly as guessable as before.
const DefaultPasswordExpiry = 7 * 24 * time.Hour

// PasswordUpdater is the narrow identity-provider operation needed by Auth.
type PasswordUpdater interface {
	UpdatePassword(ctx context.Context, userID string, password string) error
}

// Service implements the password lifecycle without exposing raw reset tokens
// to persistence or generated database types to application code.
type Service struct {
	store     authStore
	guardians ports.GuardianAuthenticator
	idp       PasswordUpdater
	mailer    mailer.Mailer
	random    io.Reader
	now       func() time.Time
	frontend  func() string
}

func NewService(
	store authStore,
	guardians ports.GuardianAuthenticator,
	idp PasswordUpdater,
	mailSender mailer.Mailer,
) *Service {
	return &Service{store: store, guardians: guardians, idp: idp, mailer: mailSender, random: rand.Reader, now: time.Now, frontend: mailer.FrontendURL}
}

// ForgotPassword verifies the caller knows a user's login identifier and initial-password secret, then mints a short-lived one-time token and emails a reset link — hand-rolled since ThunderID exposes no reset primitive. The token is never returned in the response: NIC/index numbers appear on ID cards/report cards, so aren't secret enough to also hand over the takeover token (see docs audit C-1).
func (s *Service) ForgotPassword(ctx context.Context, req ForgotPasswordRequest) (ForgotPasswordResponse, error) {
	// Logged without the secret: this is the audit trail for account-takeover
	// attempts against the forgot-password flow (S2, S11).
	logAttempt := func(outcome string) {
		slog.Info("forgot-password attempt", "role", req.Role, "identifier", req.Identifier, "outcome", outcome)
	}

	user, err := s.store.userByEmail(ctx, req.Identifier)
	if err != nil || user.Role != req.Role {
		logAttempt("no matching account")
		return ForgotPasswordResponse{}, ErrInvalidCredentials
	}

	switch req.Role {
	case authz.RoleTeacher:
		if !s.store.teacherCredentialsMatch(ctx, user.ID, req.Secret) {
			logAttempt("secret mismatch")
			return ForgotPasswordResponse{}, ErrInvalidCredentials
		}
	case authz.RoleStudent:
		if !s.store.studentCredentialsMatch(ctx, user.ID, req.Secret) {
			logAttempt("secret mismatch")
			return ForgotPasswordResponse{}, ErrInvalidCredentials
		}
	case authz.RoleParent:
		if err := s.guardians.VerifyCredentials(ctx, user.ID, req.Secret); err != nil {
			logAttempt("secret mismatch")
			return ForgotPasswordResponse{}, ErrInvalidCredentials
		}
	default:
		// Unreachable — ForgotPasswordRequest.Role is already
		// constrained to teacher/student/parent by its binding tag.
		logAttempt("invalid role")
		return ForgotPasswordResponse{}, ErrInvalidCredentials
	}

	if err := s.issueAndEmailResetToken(ctx, user.ID, user.Email); err != nil {
		logAttempt("token issue failed")
		return ForgotPasswordResponse{}, err
	}

	logAttempt("reset link sent")
	return ForgotPasswordResponse{
		Message: "If those details match an account, a password reset link has been sent to the email on file.",
	}, nil
}

func (s *Service) issueAndEmailResetToken(ctx context.Context, userID uuid.UUID, email string) error {
	raw := make([]byte, 32)
	if _, err := io.ReadFull(s.random, raw); err != nil {
		return fmt.Errorf("failed to generate reset token: %w", err)
	}
	token := hex.EncodeToString(raw)
	hash := hashResetToken(token)
	expiresAt := s.now().Add(passwordResetTokenTTL)

	if err := s.store.createResetToken(ctx, userID, hash, expiresAt); err != nil {
		return fmt.Errorf("failed to create reset token: %w", err)
	}

	// The token travels in the URL fragment, not a query string: a fragment
	// is never sent to a server, so it can't land in the SPA host's or a
	// proxy's access log, though it's still POSTed to the API explicitly (S5).
	resetLink := fmt.Sprintf("%s/reset-password#token=%s", s.frontend(), token)
	body := fmt.Sprintf(
		"A password reset was requested for your OpenSchool account.\n\n"+
			"Reset your password using the link below. It expires in %d minutes and can only be used once.\n\n%s\n\n"+
			"If you didn't request this, you can safely ignore this email.",
		int(passwordResetTokenTTL.Minutes()), resetLink,
	)
	if err := s.mailer.Send(ctx, email, "Reset your OpenSchool password", body); err != nil {
		return fmt.Errorf("failed to send reset email: %w", err)
	}

	return nil
}

// ResetPassword is the unauthenticated counterpart to ChangePassword — it
// trusts the one-time token from ForgotPassword instead of a JWT.
func (s *Service) ResetPassword(ctx context.Context, req ResetPasswordRequest) error {
	// Consume first: only one concurrent request may proceed to ThunderID.
	record, err := s.store.consumeResetToken(ctx, hashResetToken(req.Token))
	if err != nil {
		return ErrResetTokenInvalid
	}
	return s.setPassword(ctx, record.UserID, req.NewPassword)
}

// ChangePassword is used by an already-authenticated caller (profile action or first-login "Set a new password") — a verified session already exists, so no reset token is needed.
func (s *Service) ChangePassword(ctx context.Context, userID uuid.UUID, newPassword string) error {
	return s.setPassword(ctx, userID, newPassword)
}

// KeepDefaultPassword clears the must-change flag without touching the
// password — the first-login "Keep this password" choice. Refused once that
// choice has already expired (DefaultPasswordExpiry since account creation):
// at that point the account must actually change its password.
func (s *Service) KeepDefaultPassword(ctx context.Context, userID uuid.UUID) error {
	user, err := s.store.userByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}
	// Only a first-login account (must_change_password still true) may make
	// this choice. Without this check, an account that already set a real
	// password could re-trigger KeptDefaultPassword=true, which /me later
	// turns back into must_change_password=true once DefaultPasswordExpiry
	// elapses from account creation — incorrectly forcing the password
	// interstitial on an account whose password was already changed.
	if !user.MustChangePassword {
		return ErrPasswordAlreadyChanged
	}
	if s.now().Sub(user.CreatedAt) > DefaultPasswordExpiry {
		return ErrDefaultPasswordExpired
	}
	return s.store.clearMustChangePassword(ctx, userID, true)
}

func (s *Service) setPassword(ctx context.Context, userID uuid.UUID, newPassword string) error {
	user, err := s.store.userByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	if len(newPassword) < MinPasswordLength {
		return ErrPasswordTooShort
	}

	if isCommonPassword(newPassword) || s.matchesIdentitySecret(ctx, user, newPassword) {
		return ErrWeakPassword
	}

	if err := s.idp.UpdatePassword(ctx, userID.String(), newPassword); err != nil {
		return fmt.Errorf("failed to update identity provider password: %w", err)
	}

	return s.store.clearMustChangePassword(ctx, userID, false)
}

// matchesIdentitySecret reports whether candidate equals the account's own
// NIC/index number — reusing the same lookups ForgotPassword uses to verify
// that secret, so the check never has to hold the plaintext NIC/index number
// in memory itself (S1). Admin has no such secret on file.
func (s *Service) matchesIdentitySecret(ctx context.Context, user userAccount, candidate string) bool {
	switch user.Role {
	case authz.RoleTeacher:
		return s.store.teacherCredentialsMatch(ctx, user.ID, candidate)
	case authz.RoleStudent:
		return s.store.studentCredentialsMatch(ctx, user.ID, candidate)
	case authz.RoleParent:
		return s.guardians.VerifyCredentials(ctx, user.ID, candidate) == nil
	default:
		return false
	}
}

func hashResetToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
