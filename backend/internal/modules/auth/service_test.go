package auth

import (
	"bytes"
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/authz"
)

type authStoreStub struct {
	user          userAccount
	userErr       error
	teacherMatch  bool
	studentMatch  bool
	createdUser   uuid.UUID
	createdHash   string
	createdExpiry time.Time
	createErr     error
	consumed      resetToken
	consumeHash   string
	consumeErr    error
	setUser       uuid.UUID
	setValue      bool
	setCalled     bool
	setErr        error
	events        *[]string
}

func (s *authStoreStub) userByEmail(context.Context, string) (userAccount, error) {
	return s.user, s.userErr
}

func (s *authStoreStub) userByID(context.Context, uuid.UUID) (userAccount, error) {
	return s.user, s.userErr
}

func (s *authStoreStub) teacherCredentialsMatch(context.Context, uuid.UUID, string) bool {
	return s.teacherMatch
}

func (s *authStoreStub) studentCredentialsMatch(context.Context, uuid.UUID, string) bool {
	return s.studentMatch
}

func (s *authStoreStub) createResetToken(_ context.Context, user uuid.UUID, hash string, expires time.Time) error {
	s.createdUser, s.createdHash, s.createdExpiry = user, hash, expires
	return s.createErr
}

func (s *authStoreStub) consumeResetToken(_ context.Context, hash string) (resetToken, error) {
	if s.events != nil {
		*s.events = append(*s.events, "consume")
	}
	s.consumeHash = hash
	return s.consumed, s.consumeErr
}

func (s *authStoreStub) clearMustChangePassword(_ context.Context, user uuid.UUID, keptDefault bool) error {
	if s.events != nil {
		*s.events = append(*s.events, "clear-flag")
	}
	s.setUser, s.setValue, s.setCalled = user, keptDefault, true
	return s.setErr
}

type guardianStub struct{ err error }

func (s guardianStub) VerifyCredentials(context.Context, uuid.UUID, string) error { return s.err }

type passwordUpdaterStub struct {
	userID   string
	password string
	err      error
	events   *[]string
}

func (s *passwordUpdaterStub) UpdatePassword(_ context.Context, userID, password string) error {
	if s.events != nil {
		*s.events = append(*s.events, "update-idp")
	}
	s.userID, s.password = userID, password
	return s.err
}

type mailerStub struct {
	to, subject, body string
	err               error
}

func (s *mailerStub) Send(_ context.Context, to, subject, body string) error {
	s.to, s.subject, s.body = to, subject, body
	return s.err
}

func newTestService(store *authStoreStub, guardian guardianStub, provider *passwordUpdaterStub, mail *mailerStub) *Service {
	service := NewService(store, guardian, provider, mail)
	service.random = bytes.NewReader(bytes.Repeat([]byte{0x2a}, 32))
	service.now = func() time.Time { return testServiceNow }
	service.frontend = func() string { return "https://school.example" }
	return service
}

func TestForgotPasswordIssuesOnlyHashedShortLivedToken(t *testing.T) {
	userID := uuid.New()
	store := &authStoreStub{user: userAccount{ID: userID, Email: "student@example.com", Role: authz.RoleStudent}, studentMatch: true}
	provider, mail := &passwordUpdaterStub{}, &mailerStub{}
	service := newTestService(store, guardianStub{}, provider, mail)

	response, err := service.ForgotPassword(context.Background(), ForgotPasswordRequest{Role: authz.RoleStudent, Identifier: "student@example.com", Secret: "S001"})
	if err != nil {
		t.Fatal(err)
	}
	if response.Message == "" || store.createdUser != userID {
		t.Fatalf("unexpected response or token owner: %+v, %s", response, store.createdUser)
	}
	rawToken := strings.Repeat("2a", 32)
	if store.createdHash != hashResetToken(rawToken) || store.createdHash == rawToken {
		t.Fatal("reset token was not stored only as its SHA-256 hash")
	}
	if want := service.now().Add(passwordResetTokenTTL); !store.createdExpiry.Equal(want) {
		t.Fatalf("expiry = %s, want %s", store.createdExpiry, want)
	}
	if mail.to != "student@example.com" || !strings.Contains(mail.body, "https://school.example/reset-password#token="+rawToken) {
		t.Fatalf("reset email was not addressed or linked correctly: %+v", mail)
	}
}

func TestForgotPasswordRejectsMismatchedRoleAndSecrets(t *testing.T) {
	userID := uuid.New()
	tests := []struct {
		name     string
		request  ForgotPasswordRequest
		store    *authStoreStub
		guardian guardianStub
	}{
		{name: "role", request: ForgotPasswordRequest{Role: authz.RoleTeacher}, store: &authStoreStub{user: userAccount{ID: userID, Role: authz.RoleStudent}}},
		{name: "teacher secret", request: ForgotPasswordRequest{Role: authz.RoleTeacher}, store: &authStoreStub{user: userAccount{ID: userID, Role: authz.RoleTeacher}}},
		{name: "student secret", request: ForgotPasswordRequest{Role: authz.RoleStudent}, store: &authStoreStub{user: userAccount{ID: userID, Role: authz.RoleStudent}}},
		{name: "parent secret", request: ForgotPasswordRequest{Role: authz.RoleParent}, store: &authStoreStub{user: userAccount{ID: userID, Role: authz.RoleParent}}, guardian: guardianStub{err: errors.New("mismatch")}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := newTestService(test.store, test.guardian, &passwordUpdaterStub{}, &mailerStub{}).ForgotPassword(context.Background(), test.request)
			if !errors.Is(err, ErrInvalidCredentials) || test.store.createdHash != "" {
				t.Fatalf("ForgotPassword() error = %v, token hash = %q", err, test.store.createdHash)
			}
		})
	}
}

func TestResetPasswordConsumesTokenBeforeUpdatingProvider(t *testing.T) {
	userID := uuid.New()
	events := []string{}
	store := &authStoreStub{user: userAccount{ID: userID, Role: authz.RoleTeacher}, consumed: resetToken{UserID: userID}, events: &events}
	provider := &passwordUpdaterStub{events: &events}
	service := newTestService(store, guardianStub{}, provider, &mailerStub{})

	if err := service.ResetPassword(context.Background(), ResetPasswordRequest{Token: "one-time-token", NewPassword: "new-password"}); err != nil {
		t.Fatal(err)
	}
	if strings.Join(events, ",") != "consume,update-idp,clear-flag" {
		t.Fatalf("unsafe reset order: %v", events)
	}
	if store.consumeHash != hashResetToken("one-time-token") {
		t.Fatal("raw reset token was passed to persistence")
	}
	if provider.userID != userID.String() || provider.password != "new-password" {
		t.Fatalf("unexpected identity-provider update: %+v", provider)
	}
	if !store.setCalled || store.setValue {
		t.Fatal("must-change-password flag was not cleared")
	}
}

func TestResetPasswordMapsConsumeFailureToSafeError(t *testing.T) {
	store := &authStoreStub{consumeErr: errors.New("no rows")}
	provider := &passwordUpdaterStub{}
	err := newTestService(store, guardianStub{}, provider, &mailerStub{}).ResetPassword(context.Background(), ResetPasswordRequest{Token: "invalid", NewPassword: "new-password"})
	if !errors.Is(err, ErrResetTokenInvalid) || provider.userID != "" {
		t.Fatalf("ResetPassword() = %v; provider called for %q", err, provider.userID)
	}
}

func TestProviderFailureDoesNotClearFirstLoginFlag(t *testing.T) {
	userID := uuid.New()
	store := &authStoreStub{user: userAccount{ID: userID, Role: authz.RoleStudent}}
	provider := &passwordUpdaterStub{err: errors.New("provider unavailable")}
	err := newTestService(store, guardianStub{}, provider, &mailerStub{}).ChangePassword(context.Background(), userID, "new-password")
	if err == nil || store.setCalled {
		t.Fatalf("ChangePassword() = %v; set flag called = %v", err, store.setCalled)
	}
}

// testServiceNow is the fixed clock newTestService installs, so expiry tests
// can compute CreatedAt relative to it.
var testServiceNow = time.Date(2026, 9, 14, 12, 0, 0, 0, time.UTC)

func TestKeepDefaultPasswordOnlyClearsFlag(t *testing.T) {
	userID := uuid.New()
	store := &authStoreStub{user: userAccount{ID: userID, CreatedAt: testServiceNow, MustChangePassword: true}}
	provider := &passwordUpdaterStub{}
	if err := newTestService(store, guardianStub{}, provider, &mailerStub{}).KeepDefaultPassword(context.Background(), userID); err != nil {
		t.Fatal(err)
	}
	if !store.setCalled || store.setUser != userID || !store.setValue || provider.userID != "" {
		t.Fatal("keep-default-password did not record kept_default_password=true")
	}
}

func TestKeepDefaultPasswordRefusedOnceExpired(t *testing.T) {
	userID := uuid.New()
	store := &authStoreStub{user: userAccount{ID: userID, CreatedAt: testServiceNow.Add(-8 * 24 * time.Hour), MustChangePassword: true}}
	err := newTestService(store, guardianStub{}, &passwordUpdaterStub{}, &mailerStub{}).KeepDefaultPassword(context.Background(), userID)
	if !errors.Is(err, ErrDefaultPasswordExpired) || store.setCalled {
		t.Fatalf("KeepDefaultPassword() = %v; flag cleared = %v", err, store.setCalled)
	}
}

func TestKeepDefaultPasswordRefusedAfterPasswordAlreadyChanged(t *testing.T) {
	userID := uuid.New()
	store := &authStoreStub{user: userAccount{ID: userID, CreatedAt: testServiceNow, MustChangePassword: false}}
	err := newTestService(store, guardianStub{}, &passwordUpdaterStub{}, &mailerStub{}).KeepDefaultPassword(context.Background(), userID)
	if !errors.Is(err, ErrPasswordAlreadyChanged) || store.setCalled {
		t.Fatalf("KeepDefaultPassword() = %v; flag cleared = %v", err, store.setCalled)
	}
}

func TestChangePasswordRejectsCommonPassword(t *testing.T) {
	userID := uuid.New()
	store := &authStoreStub{user: userAccount{ID: userID, Role: authz.RoleTeacher}}
	provider := &passwordUpdaterStub{}
	err := newTestService(store, guardianStub{}, provider, &mailerStub{}).ChangePassword(context.Background(), userID, "Password123")
	if !errors.Is(err, ErrWeakPassword) || provider.userID != "" || store.setCalled {
		t.Fatalf("ChangePassword() = %v; provider called for %q, flag cleared = %v", err, provider.userID, store.setCalled)
	}
}

func TestChangePasswordRejectsOwnIdentitySecret(t *testing.T) {
	userID := uuid.New()
	store := &authStoreStub{user: userAccount{ID: userID, Role: authz.RoleStudent}, studentMatch: true}
	provider := &passwordUpdaterStub{}
	err := newTestService(store, guardianStub{}, provider, &mailerStub{}).ChangePassword(context.Background(), userID, "200512345678")
	if !errors.Is(err, ErrWeakPassword) || provider.userID != "" || store.setCalled {
		t.Fatalf("ChangePassword() = %v; provider called for %q, flag cleared = %v", err, provider.userID, store.setCalled)
	}
}
