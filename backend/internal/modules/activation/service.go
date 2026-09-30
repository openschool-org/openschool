package activation

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/idp"
	"github.com/openschool-org/openschool/internal/mailer"
	"github.com/openschool-org/openschool/internal/modules/auth"
	"github.com/openschool-org/openschool/internal/names"
	"github.com/openschool-org/openschool/internal/ports"
)

// emailTokenTTL bounds how long an emailed activation link stays valid.
const emailTokenTTL = 30 * time.Minute

type store interface {
	settings(context.Context) (Settings, error)
	updateSettings(context.Context, Settings) (Settings, error)
	usableCode(context.Context, string) (codeRecord, error)
	usableCodeByID(context.Context, uuid.UUID) (codeRecord, error)
	recordFailure(context.Context, uuid.UUID) error
	resetFailures(context.Context, uuid.UUID) error
	createEmailToken(context.Context, string, uuid.UUID, string, time.Time) error
	peekEmailToken(context.Context, string) (uuid.UUID, string, error)
	consumeEmailToken(context.Context, string) (bool, error)
	claimCode(context.Context, uuid.UUID) (bool, error)
	releaseCode(context.Context, uuid.UUID) error
	emailTaken(context.Context, string) (bool, error)
	recordName(context.Context, string, uuid.UUID) (personName, error)
	createUser(ctx context.Context, id uuid.UUID, email, name, role string) error
	deleteUser(context.Context, uuid.UUID) error
	linkRecord(ctx context.Context, role string, recordID, userID uuid.UUID, email string) (bool, error)
	targets(ctx context.Context, role string, classID, recordID *uuid.UUID) ([]target, error)
	issueCodes(ctx context.Context, batchID uuid.UUID, role string, codes []newCode, expiresAt time.Time, actor uuid.UUID) error
	batches(context.Context) ([]Batch, error)
	revokeBatch(context.Context, uuid.UUID) (int64, error)
	batchCodes(context.Context, uuid.UUID) (string, time.Time, []storedCode, error)
}

// Emailer sends the activation emails.
type Emailer interface {
	ActivationLink(ctx context.Context, to, nameWithInitials, link string, ttl time.Duration) error
	EmailInUse(ctx context.Context, to string) error
	AccountActivated(ctx context.Context, to, nameWithInitials, username string) error
}

// identityProvider is the narrow set of identity-provider calls activation needs.
type identityProvider interface {
	CreateUser(ctx context.Context, userType string, attrs map[string]any) (*idp.User, error)
	DeleteUser(ctx context.Context, userID string) error
	AssignRole(ctx context.Context, roleID string, userID string) error
}

type Service struct {
	store    store
	idp      identityProvider
	mailer   Emailer
	audit    ports.AuditRecorder
	random   io.Reader
	now      func() time.Time
	frontend func() string
	// cipher is nil when ACTIVATION_CODE_KEY is unset; codes are then kept as hashes only.
	cipher *codeCipher
}

// LoadCodeKey turns on reprinting when ACTIVATION_CODE_KEY is set; a malformed key is an error.
func (s *Service) LoadCodeKey() error {
	c, err := cipherFromEnv()
	if err != nil {
		return err
	}
	s.cipher = c
	return nil
}

func NewService(s store, provider identityProvider, mail Emailer, audit ports.AuditRecorder) *Service {
	return &Service{store: s, idp: provider, mailer: mail, audit: audit, random: rand.Reader, now: time.Now, frontend: mailer.FrontendURL}
}

// Status tells the public page which account types can activate right now.
func (s *Service) Status(ctx context.Context) (Status, error) {
	settings, err := s.store.settings(ctx)
	if err != nil {
		return Status{}, err
	}
	now := s.now()
	return Status{Student: settings.openFor(authz.RoleStudent, now), Parent: settings.openFor(authz.RoleParent, now)}, nil
}

// Start checks the code and identifier, then emails a one-time link. A mismatch returns nil
// like a match, so the endpoint can't be used to learn which codes or records exist.
func (s *Service) Start(ctx context.Context, req StartRequest) error {
	logAttempt := func(outcome string) {
		slog.Info("activation attempt", "role", req.Role, "outcome", outcome)
	}
	settings, err := s.store.settings(ctx)
	if err != nil {
		return err
	}
	if !settings.openFor(req.Role, s.now()) {
		return ErrClosed
	}

	code, err := s.store.usableCode(ctx, hashSecret(normalizeCode(req.Code)))
	if err != nil {
		logAttempt("unknown code")
		return nil
	}
	if code.LockedUntil != nil && s.now().Before(*code.LockedUntil) {
		logAttempt("code locked")
		return nil
	}
	// The code knows its own role, so a wrong "I am a" choice on the form does not block a real match.
	if !sameIdentifier(code.Identifier, req.Identifier) {
		logAttempt("identifier mismatch")
		return s.store.recordFailure(ctx, code.ID)
	}
	if !settings.openFor(code.Role, s.now()) {
		logAttempt("role closed")
		return nil
	}
	if code.HasLogin {
		logAttempt("already activated")
		return nil
	}
	if err := s.store.resetFailures(ctx, code.ID); err != nil {
		return err
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	taken, err := s.store.emailTaken(ctx, email)
	if err != nil {
		return err
	}
	if taken {
		// Told by email, not in the response, so the page never reveals which addresses have accounts.
		logAttempt("email in use")
		if err := s.mailer.EmailInUse(ctx, email); err != nil {
			slog.Error("activation: email-in-use notice not sent", "code_id", code.ID, "error", err)
			return ErrMailUnavailable
		}
		return nil
	}

	name, err := s.store.recordName(ctx, code.Role, code.RecordID)
	if err != nil {
		return fmt.Errorf("load record: %w", err)
	}
	raw := make([]byte, 32)
	if _, err := io.ReadFull(s.random, raw); err != nil {
		return fmt.Errorf("generate activation token: %w", err)
	}
	token := hex.EncodeToString(raw)
	if err := s.store.createEmailToken(ctx, hashSecret(token), code.ID, email, s.now().Add(emailTokenTTL)); err != nil {
		return fmt.Errorf("create activation token: %w", err)
	}
	// Token in the fragment so it never reaches a server or proxy access log (same as reset links).
	link := fmt.Sprintf("%s/activate#token=%s", s.frontend(), token)
	// Emails address people formally by their name with initials.
	if err := s.mailer.ActivationLink(ctx, email, greetingName(name), link, emailTokenTTL); err != nil {
		slog.Error("activation: link email not sent", "code_id", code.ID, "error", err)
		return ErrMailUnavailable
	}
	logAttempt("link sent")
	return nil
}

// Complete creates the login once the emailed link and a valid password arrive.
func (s *Service) Complete(ctx context.Context, req CompleteRequest) error {
	if err := auth.ValidateNewPassword(req.NewPassword); err != nil {
		return err
	}
	tokenHash := hashSecret(req.Token)
	codeID, email, err := s.store.peekEmailToken(ctx, tokenHash)
	if err != nil {
		return ErrLinkInvalid
	}
	code, err := s.store.usableCodeByID(ctx, codeID)
	if err != nil {
		return ErrLinkInvalid
	}
	// Checked before the link is spent, so a rejected password can simply be retried.
	if sameIdentifier(code.Identifier, req.NewPassword) {
		return ErrPasswordMatchesID
	}
	settings, err := s.store.settings(ctx)
	if err != nil {
		return err
	}
	if !settings.openFor(code.Role, s.now()) {
		return ErrClosed
	}
	if code.HasLogin {
		return ErrAlreadyActivated
	}

	if ok, err := s.store.consumeEmailToken(ctx, tokenHash); err != nil || !ok {
		return ErrLinkInvalid
	}
	if ok, err := s.store.claimCode(ctx, code.ID); err != nil || !ok {
		return ErrLinkInvalid
	}
	userID, err := s.createLogin(ctx, code, email, req.NewPassword)
	if err != nil {
		if releaseErr := s.store.releaseCode(context.WithoutCancel(ctx), code.ID); releaseErr != nil {
			slog.Error("activation: release code failed", "code_id", code.ID, "error", releaseErr)
		}
		return err
	}
	if s.audit != nil {
		entity := "student_account"
		if code.Role == authz.RoleParent {
			entity = "guardian_account"
		}
		_ = s.audit.Record(ctx, entity, code.RecordID, "self_activated", userID, nil, struct {
			UserID uuid.UUID `json:"user_id"`
			Email  string    `json:"email"`
		}{userID, email}, "")
	}
	// Best effort: the account exists now, so a mail failure must not report activation as failed.
	name, _ := s.store.recordName(ctx, code.Role, code.RecordID)
	if err := s.mailer.AccountActivated(ctx, email, greetingName(name), signInName(code, email)); err != nil {
		slog.Warn("activation: confirmation email not sent", "user_id", userID, "error", err)
	}
	return nil
}

// greetingName is the name with initials, worked out from the full name for older records without one.
func greetingName(n personName) string {
	if n.WithInitials != "" {
		return n.WithInitials
	}
	return names.WithInitials(n.Full)
}

// signInName is the username the new account signs in with.
func signInName(code codeRecord, email string) string {
	// Students sign in with their index number, like admin-created student accounts; parents with their email.
	if code.Role == authz.RoleStudent {
		return code.Identifier
	}
	return email
}

// createLogin mirrors the admin provisioning order and undoes earlier steps when a later one fails.
func (s *Service) createLogin(ctx context.Context, code codeRecord, email, password string) (uuid.UUID, error) {
	taken, err := s.store.emailTaken(ctx, email)
	if err != nil {
		return uuid.Nil, err
	}
	if taken {
		return uuid.Nil, ErrEmailTaken
	}
	name, err := s.store.recordName(ctx, code.Role, code.RecordID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("load record: %w", err)
	}
	given, family := names.ForIdentityProvider(name.Full, name.WithInitials, name.Calling)
	user, err := s.idp.CreateUser(ctx, code.Role, map[string]any{
		"username": signInName(code, email), "email": email, "given_name": given, "family_name": family, "password": password,
	})
	if errors.Is(err, idp.ErrDuplicateUser) {
		return uuid.Nil, ErrEmailTaken
	}
	if err != nil {
		return uuid.Nil, fmt.Errorf("create identity provider account: %w", err)
	}
	userID, err := uuid.Parse(user.ID)
	if err != nil {
		s.undo(user.ID, uuid.Nil)
		return uuid.Nil, fmt.Errorf("invalid identity provider user id: %w", err)
	}
	if err := s.store.createUser(ctx, userID, email, name.Full, code.Role); err != nil {
		s.undo(user.ID, uuid.Nil)
		return uuid.Nil, fmt.Errorf("create user record: %w", err)
	}
	if err := s.idp.AssignRole(ctx, idp.RoleID(code.Role), user.ID); err != nil {
		s.undo(user.ID, userID)
		return uuid.Nil, fmt.Errorf("assign role: %w", err)
	}
	linked, err := s.store.linkRecord(ctx, code.Role, code.RecordID, userID, email)
	if err != nil || !linked {
		s.undo(user.ID, userID)
		if err == nil {
			return uuid.Nil, ErrAlreadyActivated
		}
		return uuid.Nil, fmt.Errorf("link record: %w", err)
	}
	return userID, nil
}

// undo runs on a fresh context so a cancelled request still cleans up.
func (s *Service) undo(idpUserID string, userID uuid.UUID) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := s.idp.DeleteUser(ctx, idpUserID); err != nil {
		slog.Error("activation: identity rollback failed", "idp_user_id", idpUserID, "error", err)
	}
	if userID != uuid.Nil {
		if err := s.store.deleteUser(ctx, userID); err != nil {
			slog.Error("activation: user rollback failed", "user_id", userID, "error", err)
		}
	}
}
