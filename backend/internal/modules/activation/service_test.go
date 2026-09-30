package activation

import (
	"context"
	"crypto/rand"
	"errors"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/idp"
)

var now = time.Date(2026, 9, 30, 10, 0, 0, 0, time.UTC)

type fakeStore struct {
	cfg        Settings
	code       *codeRecord
	codeHash   string
	failures   int
	resets     int
	tokenHash  string
	tokenEmail string
	consumed   bool
	claimed    bool
	released   bool
	taken      bool
	linkOK     bool
	users      []uuid.UUID
	deleted    []uuid.UUID
	targetList []target
	issued     []newCode
}

func (f *fakeStore) settings(context.Context) (Settings, error) { return f.cfg, nil }
func (f *fakeStore) updateSettings(_ context.Context, s Settings) (Settings, error) {
	f.cfg = s
	return s, nil
}
func (f *fakeStore) usableCode(_ context.Context, hash string) (codeRecord, error) {
	if f.code == nil || hash != f.codeHash {
		return codeRecord{}, errors.New("no rows")
	}
	return *f.code, nil
}
func (f *fakeStore) usableCodeByID(_ context.Context, id uuid.UUID) (codeRecord, error) {
	if f.code == nil || f.code.ID != id || f.claimed {
		return codeRecord{}, errors.New("no rows")
	}
	return *f.code, nil
}
func (f *fakeStore) recordFailure(context.Context, uuid.UUID) error { f.failures++; return nil }
func (f *fakeStore) resetFailures(context.Context, uuid.UUID) error { f.resets++; return nil }
func (f *fakeStore) createEmailToken(_ context.Context, hash string, _ uuid.UUID, email string, _ time.Time) error {
	f.tokenHash, f.tokenEmail = hash, email
	return nil
}
func (f *fakeStore) peekEmailToken(_ context.Context, hash string) (uuid.UUID, string, error) {
	if hash != f.tokenHash || f.consumed {
		return uuid.Nil, "", errors.New("no rows")
	}
	return f.code.ID, f.tokenEmail, nil
}
func (f *fakeStore) consumeEmailToken(context.Context, string) (bool, error) {
	ok := !f.consumed
	f.consumed = true
	return ok, nil
}
func (f *fakeStore) claimCode(context.Context, uuid.UUID) (bool, error) {
	ok := !f.claimed
	f.claimed = true
	return ok, nil
}
func (f *fakeStore) releaseCode(context.Context, uuid.UUID) error {
	f.released, f.claimed = true, false
	return nil
}
func (f *fakeStore) emailTaken(context.Context, string) (bool, error) { return f.taken, nil }
func (f *fakeStore) recordName(context.Context, string, uuid.UUID) (personName, error) {
	return personName{Full: "Hettiwatta Arachchige Nimali Perera", WithInitials: "H.A.N. Perera", Calling: "Nimali"}, nil
}
func (f *fakeStore) createUser(_ context.Context, id uuid.UUID, _, _, _ string) error {
	f.users = append(f.users, id)
	return nil
}
func (f *fakeStore) deleteUser(_ context.Context, id uuid.UUID) error {
	f.deleted = append(f.deleted, id)
	return nil
}
func (f *fakeStore) linkRecord(context.Context, string, uuid.UUID, uuid.UUID, string) (bool, error) {
	return f.linkOK, nil
}
func (f *fakeStore) targets(context.Context, string, *uuid.UUID, *uuid.UUID) ([]target, error) {
	return f.targetList, nil
}
func (f *fakeStore) issueCodes(_ context.Context, _ uuid.UUID, _ string, codes []newCode, _ time.Time, _ uuid.UUID) error {
	f.issued = codes
	return nil
}
func (f *fakeStore) batches(context.Context) ([]Batch, error)              { return nil, nil }
func (f *fakeStore) revokeBatch(context.Context, uuid.UUID) (int64, error) { return 0, nil }
func (f *fakeStore) batchCodes(context.Context, uuid.UUID) (string, time.Time, []storedCode, error) {
	return "", time.Time{}, nil, nil
}

type fakeIDP struct {
	userID    string
	attrs     map[string]any
	userType  string
	createErr error
	deleted   []string
}

func (f *fakeIDP) CreateUser(_ context.Context, userType string, attrs map[string]any) (*idp.User, error) {
	f.userType, f.attrs = userType, attrs
	if f.createErr != nil {
		return nil, f.createErr
	}
	return &idp.User{ID: f.userID}, nil
}
func (f *fakeIDP) DeleteUser(_ context.Context, id string) error {
	f.deleted = append(f.deleted, id)
	return nil
}
func (f *fakeIDP) AssignRole(context.Context, string, string) error { return nil }

// fakeMail keeps activation links apart from notices, so link counts stay easy to assert.
type fakeMail struct {
	to, body      []string
	inUse         []string
	activated     []string
	activatedName string
}

func (f *fakeMail) ActivationLink(_ context.Context, to, _, link string, _ time.Duration) error {
	f.to, f.body = append(f.to, to), append(f.body, link)
	return nil
}

func (f *fakeMail) EmailInUse(_ context.Context, to string) error {
	f.inUse = append(f.inUse, to)
	return nil
}

func (f *fakeMail) AccountActivated(_ context.Context, to, name, username string) error {
	f.activated, f.activatedName = append(f.activated, to+" as "+username), name
	return nil
}

const plainCode = "ABCDE-FGHJK"

func newFixture() (*Service, *fakeStore, *fakeIDP, *fakeMail) {
	store := &fakeStore{
		cfg:      Settings{StudentEnabled: true, CodeTTLDays: 14},
		code:     &codeRecord{ID: uuid.New(), Role: "student", RecordID: uuid.New(), Identifier: "2027/0001"},
		codeHash: hashSecret(normalizeCode(plainCode)),
		linkOK:   true,
	}
	provider := &fakeIDP{userID: uuid.NewString()}
	mail := &fakeMail{}
	svc := NewService(store, provider, mail, nil)
	svc.now = func() time.Time { return now }
	svc.frontend = func() string { return "https://school.example" }
	return svc, store, provider, mail
}

func startReq() StartRequest {
	return StartRequest{Role: "student", Code: "abcde fghjk", Identifier: " 2027/0001 ", Email: "Nimali@Example.com"}
}

// tokenFromMail pulls the raw token out of the emailed link.
func tokenFromMail(t *testing.T, mail *fakeMail) string {
	t.Helper()
	m := regexp.MustCompile(`/activate#token=([0-9a-f]+)`).FindStringSubmatch(strings.Join(mail.body, "\n"))
	if m == nil {
		t.Fatalf("no activation link in mail: %v", mail.body)
	}
	return m[1]
}

func TestStartSendsLinkForMatchingDetails(t *testing.T) {
	svc, store, _, mail := newFixture()
	if err := svc.Start(context.Background(), startReq()); err != nil {
		t.Fatalf("Start() error = %v", err)
	}
	if len(mail.to) != 1 || mail.to[0] != "nimali@example.com" || store.tokenEmail != "nimali@example.com" {
		t.Fatalf("mail to %v, token email %q", mail.to, store.tokenEmail)
	}
	if store.tokenHash != hashSecret(tokenFromMail(t, mail)) {
		t.Fatal("stored token hash does not match the emailed token")
	}
	if store.resets != 1 {
		t.Fatal("failed attempts were not reset after a match")
	}
}

func TestStartHidesMismatchesAndCountsFailures(t *testing.T) {
	tests := []struct {
		name     string
		mutate   func(*StartRequest, *fakeStore)
		failures int
	}{
		{"unknown code", func(r *StartRequest, _ *fakeStore) { r.Code = "ZZZZZ-ZZZZZ" }, 0},
		{"wrong identifier", func(r *StartRequest, _ *fakeStore) { r.Identifier = "2027/9999" }, 1},
		{"wrong role", func(r *StartRequest, s *fakeStore) { r.Role = "parent"; s.cfg.ParentEnabled = true }, 1},
		{"locked code", func(_ *StartRequest, s *fakeStore) { until := now.Add(time.Minute); s.code.LockedUntil = &until }, 0},
		{"already has login", func(_ *StartRequest, s *fakeStore) { s.code.HasLogin = true }, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc, store, _, mail := newFixture()
			req := startReq()
			tt.mutate(&req, store)
			if err := svc.Start(context.Background(), req); err != nil {
				t.Fatalf("Start() error = %v, want nil so the response matches a real match", err)
			}
			if len(mail.to) != 0 || store.tokenHash != "" {
				t.Fatal("a mismatch must not send mail or create a token")
			}
			if store.failures != tt.failures {
				t.Fatalf("failures = %d, want %d", store.failures, tt.failures)
			}
		})
	}
}

func TestStartRefusesClosedRole(t *testing.T) {
	svc, store, _, _ := newFixture()
	store.cfg.StudentEnabled = false
	if err := svc.Start(context.Background(), startReq()); !errors.Is(err, ErrClosed) {
		t.Fatalf("disabled role: err = %v, want ErrClosed", err)
	}
	store.cfg.StudentEnabled = true
	closes := now.Add(-time.Hour)
	store.cfg.ClosesAt = &closes
	if err := svc.Start(context.Background(), startReq()); !errors.Is(err, ErrClosed) {
		t.Fatalf("closed window: err = %v, want ErrClosed", err)
	}
}

func TestStartWithTakenEmailSendsNoticeOnly(t *testing.T) {
	svc, store, _, mail := newFixture()
	store.taken = true
	if err := svc.Start(context.Background(), startReq()); err != nil {
		t.Fatalf("Start() error = %v", err)
	}
	if store.tokenHash != "" || len(mail.to) != 0 || len(mail.inUse) != 1 {
		t.Fatal("a taken email must get a notice, not an activation link")
	}
}

func startedFixture(t *testing.T) (*Service, *fakeStore, *fakeIDP, string) {
	t.Helper()
	svc, store, provider, mail := newFixture()
	if err := svc.Start(context.Background(), startReq()); err != nil {
		t.Fatalf("Start() error = %v", err)
	}
	return svc, store, provider, tokenFromMail(t, mail)
}

func TestCompleteCreatesLinkedLogin(t *testing.T) {
	svc, store, provider, token := startedFixture(t)
	mail := svc.mailer.(*fakeMail)
	if err := svc.Complete(context.Background(), CompleteRequest{Token: token, NewPassword: "a-Good-passphrase"}); err != nil {
		t.Fatalf("Complete() error = %v", err)
	}
	if provider.attrs["given_name"] != "Nimali" || provider.attrs["family_name"] != "Perera" {
		t.Fatalf("identity names should be the calling name and surname: %v", provider.attrs)
	}
	if provider.userType != "student" || provider.attrs["username"] != "2027/0001" || provider.attrs["password"] != "a-Good-passphrase" {
		t.Fatalf("unexpected identity-provider call: %s %v", provider.userType, provider.attrs)
	}
	if len(mail.activated) != 1 || mail.activated[0] != "nimali@example.com as 2027/0001" || mail.activatedName != "H.A.N. Perera" {
		t.Fatalf("activation confirmation = %v", mail.activated)
	}
	if !store.consumed || !store.claimed || store.released || len(store.users) != 1 {
		t.Fatalf("consumed=%v claimed=%v released=%v users=%d", store.consumed, store.claimed, store.released, len(store.users))
	}
	if err := svc.Complete(context.Background(), CompleteRequest{Token: token, NewPassword: "a-Good-passphrase"}); !errors.Is(err, ErrLinkInvalid) {
		t.Fatalf("second use: err = %v, want ErrLinkInvalid", err)
	}
}

func TestCompleteRejectsIdentifierAsPasswordWithoutSpendingLink(t *testing.T) {
	svc, store, _, token := startedFixture(t)
	store.code.Identifier = "abcdefghijk"
	if err := svc.Complete(context.Background(), CompleteRequest{Token: token, NewPassword: "ABCDEFGHIJK"}); !errors.Is(err, ErrPasswordMatchesID) {
		t.Fatalf("err = %v, want ErrPasswordMatchesID", err)
	}
	if store.consumed || store.claimed {
		t.Fatal("a rejected password must leave the link usable")
	}
}

func TestCompleteReleasesCodeWhenProviderFails(t *testing.T) {
	svc, store, provider, token := startedFixture(t)
	provider.createErr = errors.New("provider down")
	if err := svc.Complete(context.Background(), CompleteRequest{Token: token, NewPassword: "a-Good-passphrase"}); err == nil {
		t.Fatal("expected an error")
	}
	if !store.released {
		t.Fatal("code must be released so the person can start again")
	}
}

func TestCompleteUndoesLoginWhenRecordAlreadyLinked(t *testing.T) {
	svc, store, provider, token := startedFixture(t)
	store.linkOK = false
	if err := svc.Complete(context.Background(), CompleteRequest{Token: token, NewPassword: "a-Good-passphrase"}); !errors.Is(err, ErrAlreadyActivated) {
		t.Fatalf("err = %v, want ErrAlreadyActivated", err)
	}
	if len(provider.deleted) != 1 || len(store.deleted) != 1 || !store.released {
		t.Fatalf("rollback incomplete: idp deleted %v, users deleted %v, released %v", provider.deleted, store.deleted, store.released)
	}
}

func TestGenerateIssuesUniqueHashedCodes(t *testing.T) {
	svc, store, _, _ := newFixture()
	svc.random = rand.Reader
	store.targetList = []target{{ID: uuid.New(), Name: "A"}, {ID: uuid.New(), Name: "B"}, {ID: uuid.New(), Name: "C"}}
	resp, err := svc.Generate(context.Background(), GenerateRequest{Role: "student"}, uuid.New())
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}
	format := regexp.MustCompile(`^[` + codeAlphabet + `]{5}-[` + codeAlphabet + `]{5}$`)
	seen := map[string]bool{}
	for i, c := range resp.Codes {
		if !format.MatchString(c.Code) || seen[c.Code] {
			t.Fatalf("bad or repeated code %q", c.Code)
		}
		seen[c.Code] = true
		if store.issued[i].Hash != hashSecret(normalizeCode(c.Code)) || strings.Contains(store.issued[i].Hash, c.Code) {
			t.Fatal("stored hash does not match the issued code")
		}
	}
	if !resp.ExpiresAt.Equal(now.Add(14 * 24 * time.Hour)) {
		t.Fatalf("expires at %v", resp.ExpiresAt)
	}
}

func TestGenerateRefusesDisabledRole(t *testing.T) {
	svc, _, _, _ := newFixture()
	if _, err := svc.Generate(context.Background(), GenerateRequest{Role: "parent"}, uuid.New()); !errors.Is(err, ErrRoleDisabled) {
		t.Fatalf("err = %v, want ErrRoleDisabled", err)
	}
}

func TestUpdateSettingsValidatesWindow(t *testing.T) {
	svc, _, _, _ := newFixture()
	opens, closes := now, now.Add(-time.Hour)
	if _, err := svc.UpdateSettings(context.Background(), Settings{CodeTTLDays: 14, OpensAt: &opens, ClosesAt: &closes}, uuid.New()); !errors.Is(err, ErrInvalidSettings) {
		t.Fatalf("err = %v, want ErrInvalidSettings", err)
	}
}
