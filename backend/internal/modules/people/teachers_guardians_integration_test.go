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
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

func TestTeacherProvisioningAPIWithPostgres(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := testdb.Open(t)
	store := NewStudentStore(pool)
	firstUserID, duplicateEmailUserID, duplicateNICUserID := uuid.New(), uuid.New(), uuid.New()
	provider := &peopleIntegrationIdentity{userIDs: []uuid.UUID{firstUserID, duplicateEmailUserID, duplicateNICUserID}}
	service := NewTeacherService(store, provider, nil, nil)
	router := gin.New()
	group := router.Group("")
	actorID := uuid.New()
	group.Use(func(c *gin.Context) {
		c.Set("userID", actorID.String())
		c.Next()
	})
	RegisterTeacherWriteRoutes(group, service)

	request := CreateTeacherRequest{
		Email: "teacher@example.test", FullName: "Test Teacher",
		PhoneNumber: "0771234567", NICNumber: "199012345678", JoinedDate: time.Date(2025, time.January, 6, 0, 0, 0, 0, time.UTC),
		Title: "Mr", Gender: "male",
	}
	created := performPeopleJSONRequest(t, router, http.MethodPost, "/teachers", request)
	if created.Code != http.StatusCreated {
		t.Fatalf("create teacher: code=%d body=%s", created.Code, created.Body.String())
	}
	if provider.createCalls != 1 || provider.attributes[0]["password"] != request.NICNumber || provider.attributes[0]["employee_number"] != "00001" {
		t.Fatalf("identity provisioning mismatch: calls=%d attributes=%v", provider.createCalls, provider.attributes)
	}

	var teacherID uuid.UUID
	var role, fullName, employeeNumber, nic string
	var mustChangePassword bool
	if err := pool.QueryRow(context.Background(), `
		SELECT tp.id, u.role, u.full_name, u.must_change_password, tp.employee_number, tp.nic_number
		FROM users u JOIN teacher_profiles tp ON tp.user_id = u.id
		WHERE u.id = $1`, firstUserID).Scan(&teacherID, &role, &fullName, &mustChangePassword, &employeeNumber, &nic); err != nil {
		t.Fatalf("read provisioned teacher: %v", err)
	}
	if teacherID == uuid.Nil || role != authz.RoleTeacher || fullName != "Test Teacher" || !mustChangePassword || employeeNumber != "00001" || nic != request.NICNumber {
		t.Fatalf("unexpected teacher: id=%s role=%q name=%q must_change=%v employee=%q nic=%q", teacherID, role, fullName, mustChangePassword, employeeNumber, nic)
	}

	request.FullName = "Duplicate Email"
	duplicateEmail := performPeopleJSONRequest(t, router, http.MethodPost, "/teachers", request)
	if duplicateEmail.Code != http.StatusBadRequest || !slices.Contains(provider.deleted, duplicateEmailUserID.String()) {
		t.Fatalf("duplicate email rollback: code=%d deleted=%v body=%s", duplicateEmail.Code, provider.deleted, duplicateEmail.Body.String())
	}
	assertUserAbsent(t, pool, duplicateEmailUserID)

	request.Email = "duplicate-nic@example.test"
	duplicateNIC := performPeopleJSONRequest(t, router, http.MethodPost, "/teachers", request)
	if duplicateNIC.Code != http.StatusBadRequest || !slices.Contains(provider.deleted, duplicateNICUserID.String()) {
		t.Fatalf("duplicate NIC rollback: code=%d deleted=%v body=%s", duplicateNIC.Code, provider.deleted, duplicateNIC.Body.String())
	}
	assertUserAbsent(t, pool, duplicateNICUserID)
}

func TestGuardianLifecycleAPIWithPostgres(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := testdb.Open(t)
	ctx := context.Background()
	store := NewGuardianStore(pool)
	parentUserID := uuid.New()
	provider := &peopleIntegrationIdentity{userIDs: []uuid.UUID{parentUserID}}
	service := NewGuardianService(store, provider, nil)
	router := gin.New()
	group := router.Group("")
	actorID := uuid.New()
	group.Use(func(c *gin.Context) {
		c.Set("userID", actorID.String())
		c.Next()
	})
	RegisterGuardianWriteRoutes(group, service)

	guardianRequest := CreateGuardianRequest{
		FullName: "Test Parent", Relationship: "guardian", Phone: "0771234567",
		Email: "parent@example.test", NICNumber: "198012345678",
	}
	created := performPeopleJSONRequest(t, router, http.MethodPost, "/guardians", guardianRequest)
	if created.Code != http.StatusCreated {
		t.Fatalf("create guardian: code=%d body=%s", created.Code, created.Body.String())
	}
	var guardianID uuid.UUID
	if err := pool.QueryRow(ctx, "SELECT id FROM guardians WHERE nic_number = $1", guardianRequest.NICNumber).Scan(&guardianID); err != nil {
		t.Fatalf("read guardian: %v", err)
	}

	studentUserID := uuid.New()
	seedAccessUser(t, pool, studentUserID, "guardian-child@example.test", authz.RoleStudent)
	var studentID uuid.UUID
	if err := pool.QueryRow(ctx, "INSERT INTO student_profiles (user_id, full_name, index_number) VALUES ($1, 'Guardian Child', 'GUARDIAN-001') RETURNING id", studentUserID).Scan(&studentID); err != nil {
		t.Fatal(err)
	}
	linked := performPeopleJSONRequest(t, router, http.MethodPost, "/students/"+studentID.String()+"/guardians", LinkGuardianRequest{GuardianID: guardianID.String(), IsPrimaryContact: true})
	if linked.Code != http.StatusOK {
		t.Fatalf("link guardian: code=%d body=%s", linked.Code, linked.Body.String())
	}
	var primary bool
	if err := pool.QueryRow(ctx, "SELECT is_primary_contact FROM student_guardians WHERE student_id = $1 AND guardian_id = $2", studentID, guardianID).Scan(&primary); err != nil || !primary {
		t.Fatalf("primary guardian link: primary=%v err=%v", primary, err)
	}

	provisioned := performPeopleJSONRequest(t, router, http.MethodPost, "/guardians/"+guardianID.String()+"/provision-login", ProvisionGuardianLoginRequest{Username: "parent.one"})
	if provisioned.Code != http.StatusOK {
		t.Fatalf("provision guardian: code=%d body=%s", provisioned.Code, provisioned.Body.String())
	}
	if provider.createCalls != 1 || provider.attributes[0]["password"] != guardianRequest.NICNumber {
		t.Fatalf("guardian identity attributes: calls=%d attributes=%v", provider.createCalls, provider.attributes)
	}
	var linkedUserID uuid.UUID
	var role string
	var mustChangePassword bool
	if err := pool.QueryRow(ctx, `
		SELECT g.user_id, u.role, u.must_change_password
		FROM guardians g JOIN users u ON u.id = g.user_id
		WHERE g.id = $1`, guardianID).Scan(&linkedUserID, &role, &mustChangePassword); err != nil {
		t.Fatalf("read provisioned guardian login: %v", err)
	}
	if linkedUserID != parentUserID || role != authz.RoleParent || !mustChangePassword {
		t.Fatalf("unexpected guardian login: user=%s role=%q must_change=%v", linkedUserID, role, mustChangePassword)
	}
	if status := studentAccessStatus(NewStudentAccessAuthorizer(pool), parentUserID, authz.RoleParent, studentID); status != http.StatusOK {
		t.Fatalf("provisioned guardian access status=%d", status)
	}

	repeated := performPeopleJSONRequest(t, router, http.MethodPost, "/guardians/"+guardianID.String()+"/provision-login", ProvisionGuardianLoginRequest{Username: "parent.one"})
	if repeated.Code != http.StatusConflict || provider.createCalls != 1 {
		t.Fatalf("repeat provision: code=%d calls=%d body=%s", repeated.Code, provider.createCalls, repeated.Body.String())
	}

	duplicateGuardian := performPeopleJSONRequest(t, router, http.MethodPost, "/guardians", guardianRequest)
	if duplicateGuardian.Code != http.StatusBadRequest {
		t.Fatalf("duplicate guardian NIC: code=%d body=%s", duplicateGuardian.Code, duplicateGuardian.Body.String())
	}

	failingGuardianID := uuid.New()
	if _, err := pool.Exec(ctx, `
		INSERT INTO guardians (id, full_name, relationship, phone, email, nic_number)
		VALUES ($1, 'Rollback Parent', 'guardian', '0712345678', 'rollback-parent@example.test', '197012345678')`, failingGuardianID); err != nil {
		t.Fatal(err)
	}
	failingUserID := uuid.New()
	failingProvider := &peopleIntegrationIdentity{userIDs: []uuid.UUID{failingUserID}, assignErr: errors.New("role assignment failed")}
	failingService := NewGuardianService(store, failingProvider, nil)
	if _, err := failingService.Provision(ctx, failingGuardianID, ProvisionGuardianLoginRequest{Username: "rollback.parent"}, actorID); err == nil {
		t.Fatal("expected guardian role assignment failure")
	}
	if !slices.Contains(failingProvider.deleted, failingUserID.String()) {
		t.Fatalf("guardian identity was not rolled back: deleted=%v", failingProvider.deleted)
	}
	assertUserAbsent(t, pool, failingUserID)
	var guardianUserIsNull bool
	if err := pool.QueryRow(ctx, "SELECT user_id IS NULL FROM guardians WHERE id = $1", failingGuardianID).Scan(&guardianUserIsNull); err != nil || !guardianUserIsNull {
		t.Fatalf("guardian link rollback: user_id_is_null=%v err=%v", guardianUserIsNull, err)
	}
}

func performPeopleJSONRequest(t *testing.T, router http.Handler, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	payload, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(method, path, bytes.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}
