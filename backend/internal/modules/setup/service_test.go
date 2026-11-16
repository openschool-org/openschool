package setup

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/idp"
)

type setupStore struct {
	counts       []int64
	countCalls   int
	createResult AdminUser
	createErr    error
	createdID    uuid.UUID
	createdEmail string
	createdName  string
	deletedID    uuid.UUID
	deleteErr    error
}

func (s *setupStore) countUsersByRole(context.Context, string) (int64, error) {
	index := s.countCalls
	s.countCalls++
	if index >= len(s.counts) {
		index = len(s.counts) - 1
	}
	return s.counts[index], nil
}

func (s *setupStore) createAdmin(_ context.Context, id uuid.UUID, email, fullName string) (AdminUser, error) {
	s.createdID, s.createdEmail, s.createdName = id, email, fullName
	return s.createResult, s.createErr
}

func (s *setupStore) deleteUser(_ context.Context, id uuid.UUID) error {
	s.deletedID = id
	return s.deleteErr
}

type setupIdentity struct {
	created       bool
	attributes    map[string]any
	user          *idp.User
	createErr     error
	assigned      bool
	assignedUser  string
	assignErr     error
	deletedUserID string
}

func (i *setupIdentity) CreateUser(_ context.Context, _ string, attributes map[string]any) (*idp.User, error) {
	i.created, i.attributes = true, attributes
	return i.user, i.createErr
}

func (*setupIdentity) UpdateUser(context.Context, string, string, map[string]any) error { return nil }

func (i *setupIdentity) DeleteUser(_ context.Context, userID string) error {
	i.deletedUserID = userID
	return nil
}

func (i *setupIdentity) AssignRole(_ context.Context, _ string, userID string) error {
	i.assigned, i.assignedUser = true, userID
	return i.assignErr
}

func (*setupIdentity) ListUsers(context.Context) ([]idp.User, error) { return nil, nil }

func adminRequest() RegisterAdminRequest {
	return RegisterAdminRequest{Email: "admin@example.test", Username: "admin", GivenName: "Open", FamilyName: "School", PhoneNumber: "0700000000", Password: "password"}
}

func TestNeedsSetupUsesAdminCount(t *testing.T) {
	needsSetup, err := NewService(&setupStore{counts: []int64{0}}, &setupIdentity{}).NeedsSetup(context.Background())
	if err != nil || !needsSetup {
		t.Fatalf("needsSetup=%v err=%v", needsSetup, err)
	}
}

func TestRegisterFirstAdminRejectsCompletedSetupBeforeIdentityWrite(t *testing.T) {
	idp := &setupIdentity{}
	_, err := NewService(&setupStore{counts: []int64{1}}, idp).RegisterFirstAdmin(context.Background(), adminRequest())
	if !errors.Is(err, ErrAlreadyDone) || idp.created {
		t.Fatalf("error=%v identityCreated=%v", err, idp.created)
	}
}

func TestRegisterFirstAdminCreatesBothAccountsAndAssignsRole(t *testing.T) {
	userID := uuid.New()
	store := &setupStore{counts: []int64{0, 0}, createResult: AdminUser{ID: userID, Email: "admin@example.test"}}
	idp := &setupIdentity{user: &idp.User{ID: userID.String()}}
	user, err := NewService(store, idp).RegisterFirstAdmin(context.Background(), adminRequest())
	if err != nil {
		t.Fatal(err)
	}
	if user.ID != userID || store.createdID != userID || store.createdName != "Open School" || !idp.assigned || idp.assignedUser != userID.String() {
		t.Fatalf("unexpected setup result: user=%#v store=%#v idp=%#v", user, store, idp)
	}
	if idp.attributes["username"] != "admin" || idp.attributes["phone_number"] != "0700000000" {
		t.Fatalf("identity attributes were not preserved: %#v", idp.attributes)
	}
}

func TestRegisterFirstAdminRollsBackIdentityWhenRaceIsLost(t *testing.T) {
	userID := uuid.New()
	idp := &setupIdentity{user: &idp.User{ID: userID.String()}}
	// Another setup committed first: createAdmin's locked re-check reports it.
	_, err := NewService(&setupStore{counts: []int64{0}, createErr: ErrAlreadyDone}, idp).RegisterFirstAdmin(context.Background(), adminRequest())
	if !errors.Is(err, ErrAlreadyDone) || idp.deletedUserID != userID.String() {
		t.Fatalf("error=%v deletedIdentity=%q", err, idp.deletedUserID)
	}
}

func TestRegisterFirstAdminRollsBackIdentityWhenLocalCreateFails(t *testing.T) {
	userID := uuid.New()
	idp := &setupIdentity{user: &idp.User{ID: userID.String()}}
	_, err := NewService(&setupStore{counts: []int64{0, 0}, createErr: errors.New("database unavailable")}, idp).RegisterFirstAdmin(context.Background(), adminRequest())
	if err == nil || idp.deletedUserID != userID.String() {
		t.Fatalf("error=%v deletedIdentity=%q", err, idp.deletedUserID)
	}
}

func TestRegisterFirstAdminRollsBackBothAccountsWhenRoleAssignmentFails(t *testing.T) {
	userID := uuid.New()
	store := &setupStore{counts: []int64{0, 0}, createResult: AdminUser{ID: userID}}
	idp := &setupIdentity{user: &idp.User{ID: userID.String()}, assignErr: errors.New("role assignment failed")}
	_, err := NewService(store, idp).RegisterFirstAdmin(context.Background(), adminRequest())
	if err == nil || store.deletedID != userID || idp.deletedUserID != userID.String() {
		t.Fatalf("error=%v localDelete=%s identityDelete=%q", err, store.deletedID, idp.deletedUserID)
	}
}
