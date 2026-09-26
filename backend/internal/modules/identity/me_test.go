package identity

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/openschool-org/openschool/internal/modules/auth"
)

type provisionerStub struct {
	called   bool
	command  ensureUserCommand
	result   provisionedUser
	err      error
	language string
}

func (s *provisionerStub) ensureExists(_ context.Context, command ensureUserCommand) (provisionedUser, error) {
	s.called = true
	s.command = command
	return s.result, s.err
}

func (s *provisionerStub) setLanguage(_ context.Context, _ uuid.UUID, language string) error {
	s.language = language
	return s.err
}

func TestSetLanguageRejectsUnsupported(t *testing.T) {
	stub := &provisionerStub{}
	service := newMeService(stub)
	if err := service.setLanguage(context.Background(), uuid.New(), "fr"); !errors.Is(err, errUnsupportedLanguage) {
		t.Fatalf("expected errUnsupportedLanguage, got %v", err)
	}
	if err := service.setLanguage(context.Background(), uuid.New(), "si"); err != nil || stub.language != "si" {
		t.Fatalf("supported language was not saved: %v", err)
	}
}

func TestEnsureProvisionedSkipsUnknownRoles(t *testing.T) {
	repository := &provisionerStub{}
	service := newMeService(repository)

	result, err := service.ensureProvisioned(context.Background(), ensureUserCommand{})
	if err != nil || result.MustChangePassword || repository.called {
		t.Fatalf("unknown role should not provision a user")
	}
}

func TestEnsureProvisionedDelegatesKnownRole(t *testing.T) {
	repository := &provisionerStub{result: provisionedUser{MustChangePassword: true}}
	service := newMeService(repository)
	command := ensureUserCommand{Role: "teacher", Email: "teacher@example.test"}

	result, err := service.ensureProvisioned(context.Background(), command)
	if err != nil {
		t.Fatal(err)
	}
	if !repository.called || repository.command != command || !result.MustChangePassword {
		t.Fatalf("known role was not forwarded to the repository")
	}
}

func TestDefaultPasswordExpired(t *testing.T) {
	now := time.Date(2026, 9, 14, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name string
		user provisionedUser
		want bool
	}{
		{"never kept default password", provisionedUser{KeptDefaultPassword: false, CreatedAt: now.Add(-30 * 24 * time.Hour)}, false},
		{"kept recently", provisionedUser{KeptDefaultPassword: true, CreatedAt: now.Add(-time.Hour)}, false},
		{"kept past the expiry window", provisionedUser{KeptDefaultPassword: true, CreatedAt: now.Add(-(auth.DefaultPasswordExpiry + time.Hour))}, true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := test.user.defaultPasswordExpired(now); got != test.want {
				t.Fatalf("defaultPasswordExpired() = %v, want %v", got, test.want)
			}
		})
	}
}
