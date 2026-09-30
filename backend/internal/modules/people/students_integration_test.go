//go:build integration

package people

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"slices"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/idp"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/ports"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

type peopleIntegrationIdentity struct {
	userIDs     []uuid.UUID
	createCalls int
	assignErr   error
	deleted     []string
	attributes  []map[string]any
}

func (i *peopleIntegrationIdentity) CreateUser(_ context.Context, _ string, attributes map[string]any) (*idp.User, error) {
	if i.createCalls >= len(i.userIDs) {
		return nil, errors.New("integration identity has no configured user ID")
	}
	userID := i.userIDs[i.createCalls]
	i.createCalls++
	i.attributes = append(i.attributes, attributes)
	return &idp.User{ID: userID.String()}, nil
}
func (*peopleIntegrationIdentity) UpdateUser(context.Context, string, string, map[string]any) error {
	return nil
}
func (i *peopleIntegrationIdentity) DeleteUser(_ context.Context, userID string) error {
	i.deleted = append(i.deleted, userID)
	return nil
}
func (i *peopleIntegrationIdentity) AssignRole(context.Context, string, string) error {
	return i.assignErr
}
func (*peopleIntegrationIdentity) ListUsers(context.Context) ([]idp.User, error) { return nil, nil }

func TestStudentProvisioningAPIWithPostgres(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := testdb.Open(t)
	store := NewStudentStore(pool)
	firstUserID, duplicateEmailUserID := uuid.New(), uuid.New()
	provider := &peopleIntegrationIdentity{userIDs: []uuid.UUID{firstUserID, duplicateEmailUserID}}
	service := NewStudentService(store, provider, nil, nil, nil, nil)
	router := gin.New()
	group := router.Group("")
	actorID := uuid.New()
	group.Use(func(c *gin.Context) {
		c.Set("userID", actorID.String())
		c.Next()
	})
	RegisterStudentRoutes(group, group, service, store, service, nil)

	request := CreateStudentRequest{
		Email: "student@example.test", FullName: "Test Student", CallingName: "Testy",
		PhoneNumber: "0771234567", IndexNumber: "STU-001", Address: "Colombo",
		WhatsApp: "0712345678", Gender: "male",
	}
	created := performStudentRequest(t, router, request)
	if created.Code != http.StatusCreated {
		t.Fatalf("create student: code=%d body=%s", created.Code, created.Body.String())
	}
	if provider.attributes[0]["given_name"] != "Testy" || provider.attributes[0]["family_name"] != "Student" {
		t.Fatalf("identity names should be the calling name and surname: %v", provider.attributes[0])
	}
	var withInitials, calling string
	if err := pool.QueryRow(context.Background(), "SELECT name_with_initials, calling_name FROM student_profiles WHERE index_number = $1", request.IndexNumber).Scan(&withInitials, &calling); err != nil || withInitials != "T. Student" || calling != "Testy" {
		t.Fatalf("names on the profile: %q %q %v", withInitials, calling, err)
	}
	if provider.createCalls != 1 || provider.attributes[0]["password"] != request.IndexNumber {
		t.Fatalf("identity provisioning mismatch: calls=%d attributes=%v", provider.createCalls, provider.attributes)
	}

	var studentID uuid.UUID
	var role, fullName, indexNumber string
	var mustChangePassword bool
	if err := pool.QueryRow(context.Background(), `
		SELECT sp.id, u.role, u.full_name, u.must_change_password, sp.index_number
		FROM users u JOIN student_profiles sp ON sp.user_id = u.id
		WHERE u.id = $1`, firstUserID).Scan(&studentID, &role, &fullName, &mustChangePassword, &indexNumber); err != nil {
		t.Fatalf("read provisioned student: %v", err)
	}
	if role != authz.RoleStudent || fullName != "Test Student" || !mustChangePassword || indexNumber != request.IndexNumber {
		t.Fatalf("unexpected persisted student: role=%q name=%q must_change=%v index=%q", role, fullName, mustChangePassword, indexNumber)
	}

	duplicateIndex := performStudentRequest(t, router, request)
	if duplicateIndex.Code != http.StatusBadRequest || provider.createCalls != 1 {
		t.Fatalf("duplicate index: code=%d create_calls=%d body=%s", duplicateIndex.Code, provider.createCalls, duplicateIndex.Body.String())
	}

	request.IndexNumber = "STU-002"
	duplicateEmail := performStudentRequest(t, router, request)
	if duplicateEmail.Code != http.StatusBadRequest || !slices.Contains(provider.deleted, duplicateEmailUserID.String()) {
		t.Fatalf("duplicate email rollback: code=%d deleted=%v body=%s", duplicateEmail.Code, provider.deleted, duplicateEmail.Body.String())
	}
	assertUserAbsent(t, pool, duplicateEmailUserID)

	roleFailureUserID := uuid.New()
	failingProvider := &peopleIntegrationIdentity{userIDs: []uuid.UUID{roleFailureUserID}, assignErr: errors.New("role assignment failed")}
	failingService := NewStudentService(store, failingProvider, nil, nil, nil, nil)
	request.Email, request.IndexNumber = "rollback@example.test", "STU-003"
	if _, err := failingService.Create(context.Background(), request, actorID); err == nil {
		t.Fatal("expected role assignment failure")
	}
	if !slices.Contains(failingProvider.deleted, roleFailureUserID.String()) {
		t.Fatalf("identity user was not rolled back: deleted=%v", failingProvider.deleted)
	}
	assertUserAbsent(t, pool, roleFailureUserID)
}

func TestStudentAccessAuthorizationWithPostgres(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := testdb.Open(t)
	ctx := context.Background()
	studentUserID, otherStudentUserID := uuid.New(), uuid.New()
	parentUserID, unrelatedParentUserID := uuid.New(), uuid.New()
	seedAccessUser(t, pool, studentUserID, "student-one@example.test", authz.RoleStudent)
	seedAccessUser(t, pool, otherStudentUserID, "student-two@example.test", authz.RoleStudent)
	seedAccessUser(t, pool, parentUserID, "parent-one@example.test", authz.RoleParent)
	seedAccessUser(t, pool, unrelatedParentUserID, "parent-two@example.test", authz.RoleParent)

	var studentID, otherStudentID uuid.UUID
	if err := pool.QueryRow(ctx, "INSERT INTO student_profiles (user_id, full_name, index_number) VALUES ($1, 'Student One', 'ACCESS-001') RETURNING id", studentUserID).Scan(&studentID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO student_profiles (user_id, full_name, index_number) VALUES ($1, 'Student Two', 'ACCESS-002') RETURNING id", otherStudentUserID).Scan(&otherStudentID); err != nil {
		t.Fatal(err)
	}
	var guardianID uuid.UUID
	if err := pool.QueryRow(ctx, `
		INSERT INTO guardians (user_id, full_name, relationship, phone, email, nic_number)
		VALUES ($1, 'Parent One', 'guardian', '0771234567', 'parent-one@example.test', 'NIC-ACCESS-001')
		RETURNING id`, parentUserID).Scan(&guardianID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, "INSERT INTO student_guardians (student_id, guardian_id) VALUES ($1, $2)", studentID, guardianID); err != nil {
		t.Fatal(err)
	}

	authorizer := NewStudentAccessAuthorizer(pool)
	tests := []struct {
		name     string
		userID   uuid.UUID
		role     string
		targetID uuid.UUID
		want     int
	}{
		{name: "student owns target", userID: studentUserID, role: authz.RoleStudent, targetID: studentID, want: http.StatusOK},
		{name: "student cannot access another student", userID: studentUserID, role: authz.RoleStudent, targetID: otherStudentID, want: http.StatusForbidden},
		{name: "linked guardian owns target", userID: parentUserID, role: authz.RoleParent, targetID: studentID, want: http.StatusOK},
		{name: "guardian cannot access unlinked student", userID: parentUserID, role: authz.RoleParent, targetID: otherStudentID, want: http.StatusForbidden},
		{name: "unrelated guardian cannot access target", userID: unrelatedParentUserID, role: authz.RoleParent, targetID: studentID, want: http.StatusForbidden},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := studentAccessStatus(authorizer, test.userID, test.role, test.targetID); got != test.want {
				t.Fatalf("status=%d, want %d", got, test.want)
			}
		})
	}
}

func performStudentRequest(t *testing.T, router http.Handler, request CreateStudentRequest) *httptest.ResponseRecorder {
	t.Helper()
	payload, err := json.Marshal(request)
	if err != nil {
		t.Fatal(err)
	}
	httpRequest := httptest.NewRequest(http.MethodPost, "/students", bytes.NewReader(payload))
	httpRequest.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httpRequest)
	return response
}

func assertUserAbsent(t *testing.T, pool *pgxpool.Pool, userID uuid.UUID) {
	t.Helper()
	var count int
	if err := pool.QueryRow(context.Background(), "SELECT COUNT(*) FROM users WHERE id = $1", userID).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("user %s still exists after rollback", userID)
	}
}

func seedAccessUser(t *testing.T, pool *pgxpool.Pool, id uuid.UUID, email, role string) {
	t.Helper()
	if _, err := pool.Exec(context.Background(), "INSERT INTO users (id, email, full_name, role) VALUES ($1, $2, $3, $4)", id, email, email, role); err != nil {
		t.Fatal(err)
	}
}

func studentAccessStatus(authorizer ports.StudentAccessAuthorizer, userID uuid.UUID, role string, studentID uuid.UUID) int {
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("userID", userID.String())
		c.Set("roles", []string{role})
		c.Next()
	})
	router.GET("/students/:id", middleware.RequireStudentAccess(authorizer), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/students/"+studentID.String(), nil))
	return response.Code
}
