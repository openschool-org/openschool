//go:build integration

package studentleadership

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

type studentLeadershipFixture struct {
	adminUserID, teacherUserID, otherTeacherUserID uuid.UUID
	teacherID, otherTeacherID, studentID           uuid.UUID
	academicYearID                                 uuid.UUID
}

func TestStudentLeadershipWorkflowsWithPostgres(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := testdb.Open(t)
	fixture := seedStudentLeadershipFixture(t, pool)
	service := NewService(NewRepository(pool))
	adminRouter := studentLeadershipRouter(service, fixture.adminUserID, authz.RoleAdmin)
	teacherRouter := studentLeadershipRouter(service, fixture.teacherUserID, authz.RoleTeacher)
	otherTeacherRouter := studentLeadershipRouter(service, fixture.otherTeacherUserID, authz.RoleTeacher)

	prefectResponse := performStudentLeadershipRequest(t, adminRouter, http.MethodPut, "/prefects", AssignPrefectRequest{
		AcademicYearID: fixture.academicYearID.String(), StudentID: fixture.studentID.String(), Rank: "senior",
	})
	if prefectResponse.Code != http.StatusOK {
		t.Fatalf("assign prefect: code=%d body=%s", prefectResponse.Code, prefectResponse.Body.String())
	}
	var prefect Prefect
	if err := json.Unmarshal(prefectResponse.Body.Bytes(), &prefect); err != nil {
		t.Fatal(err)
	}
	updatedPrefect := performStudentLeadershipRequest(t, adminRouter, http.MethodPut, "/prefects", AssignPrefectRequest{
		AcademicYearID: fixture.academicYearID.String(), StudentID: fixture.studentID.String(), Rank: "head",
	})
	if updatedPrefect.Code != http.StatusOK || !bytes.Contains(updatedPrefect.Body.Bytes(), []byte(`"rank":"head"`)) {
		t.Fatalf("update prefect: code=%d body=%s", updatedPrefect.Code, updatedPrefect.Body.String())
	}
	prefects := performStudentLeadershipRequest(t, teacherRouter, http.MethodGet, "/prefects?academic_year_id="+fixture.academicYearID.String(), nil)
	if prefects.Code != http.StatusOK || !bytes.Contains(prefects.Body.Bytes(), []byte(`"student_name":"Leadership Student"`)) || !bytes.Contains(prefects.Body.Bytes(), []byte(`"rank":"head"`)) {
		t.Fatalf("list prefects: code=%d body=%s", prefects.Code, prefects.Body.String())
	}
	prefectAppointments := performStudentLeadershipRequest(t, adminRouter, http.MethodGet, "/students/"+fixture.studentID.String()+"/prefect-appointments", nil)
	if prefectAppointments.Code != http.StatusOK || !bytes.Contains(prefectAppointments.Body.Bytes(), []byte(`"academic_year_label":"2026 Student Leadership"`)) {
		t.Fatalf("student prefect appointments: code=%d body=%s", prefectAppointments.Code, prefectAppointments.Body.String())
	}
	prefectYears := performStudentLeadershipRequest(t, teacherRouter, http.MethodGet, "/prefects/years", nil)
	if prefectYears.Code != http.StatusOK || !bytes.Contains(prefectYears.Body.Bytes(), []byte(`"label":"2026 Student Leadership"`)) {
		t.Fatalf("prefect years: code=%d body=%s", prefectYears.Code, prefectYears.Body.String())
	}

	createdSociety := performStudentLeadershipRequest(t, adminRouter, http.MethodPost, "/societies", CreateSocietyRequest{
		Name: "Science Society", TeacherInChargeID: fixture.teacherID.String(), AcademicYearID: fixture.academicYearID.String(),
	})
	if createdSociety.Code != http.StatusCreated {
		t.Fatalf("create society: code=%d body=%s", createdSociety.Code, createdSociety.Body.String())
	}
	var society Society
	if err := json.Unmarshal(createdSociety.Body.Bytes(), &society); err != nil {
		t.Fatal(err)
	}
	member := performStudentLeadershipRequest(t, teacherRouter, http.MethodPut, "/societies/"+society.ID.String()+"/members", AssignSocietyMemberRequest{StudentID: fixture.studentID.String(), Role: "member"})
	if member.Code != http.StatusOK {
		t.Fatalf("teacher in charge adds member: code=%d body=%s", member.Code, member.Body.String())
	}
	var societyMember SocietyMember
	if err := json.Unmarshal(member.Body.Bytes(), &societyMember); err != nil {
		t.Fatal(err)
	}
	updatedMember := performStudentLeadershipRequest(t, teacherRouter, http.MethodPut, "/societies/"+society.ID.String()+"/members", AssignSocietyMemberRequest{StudentID: fixture.studentID.String(), Role: "leader"})
	if updatedMember.Code != http.StatusOK || !bytes.Contains(updatedMember.Body.Bytes(), []byte(`"role":"leader"`)) {
		t.Fatalf("update society member: code=%d body=%s", updatedMember.Code, updatedMember.Body.String())
	}
	forbidden := performStudentLeadershipRequest(t, otherTeacherRouter, http.MethodPut, "/societies/"+society.ID.String()+"/members", AssignSocietyMemberRequest{StudentID: fixture.studentID.String(), Role: "secretary"})
	if forbidden.Code != http.StatusForbidden {
		t.Fatalf("unassigned teacher manages society: code=%d body=%s", forbidden.Code, forbidden.Body.String())
	}
	members := performStudentLeadershipRequest(t, teacherRouter, http.MethodGet, "/societies/"+society.ID.String()+"/members", nil)
	if members.Code != http.StatusOK || !bytes.Contains(members.Body.Bytes(), []byte(`"role":"leader"`)) || !bytes.Contains(members.Body.Bytes(), []byte(`"student_name":"Leadership Student"`)) {
		t.Fatalf("list society members: code=%d body=%s", members.Code, members.Body.String())
	}
	memberships := performStudentLeadershipRequest(t, adminRouter, http.MethodGet, "/students/"+fixture.studentID.String()+"/society-memberships", nil)
	if memberships.Code != http.StatusOK || !bytes.Contains(memberships.Body.Bytes(), []byte(`"society_name":"Science Society"`)) {
		t.Fatalf("student society memberships: code=%d body=%s", memberships.Code, memberships.Body.String())
	}
	societies := performStudentLeadershipRequest(t, teacherRouter, http.MethodGet, "/societies?academic_year_id="+fixture.academicYearID.String(), nil)
	if societies.Code != http.StatusOK || !bytes.Contains(societies.Body.Bytes(), []byte(`"member_count":1`)) {
		t.Fatalf("list societies: code=%d body=%s", societies.Code, societies.Body.String())
	}

	deactivated := performStudentLeadershipRequest(t, teacherRouter, http.MethodPost, "/societies/"+society.ID.String()+"/members/"+societyMember.ID.String()+"/deactivate", DeactivateSocietyMemberRequest{Reason: "Left the school"})
	if deactivated.Code != http.StatusOK {
		t.Fatalf("deactivate society member: code=%d body=%s", deactivated.Code, deactivated.Body.String())
	}
	// The membership stays on the student's record as a former one, and stops counting.
	formerMemberships := performStudentLeadershipRequest(t, adminRouter, http.MethodGet, "/students/"+fixture.studentID.String()+"/society-memberships", nil)
	if formerMemberships.Code != http.StatusOK || bytes.Contains(formerMemberships.Body.Bytes(), []byte(`"left_at":null`)) {
		t.Fatalf("former membership missing: code=%d body=%s", formerMemberships.Code, formerMemberships.Body.String())
	}
	afterLeaving := performStudentLeadershipRequest(t, teacherRouter, http.MethodGet, "/societies?academic_year_id="+fixture.academicYearID.String(), nil)
	if !bytes.Contains(afterLeaving.Body.Bytes(), []byte(`"member_count":0`)) {
		t.Fatalf("former member still counted: body=%s", afterLeaving.Body.String())
	}
	again := performStudentLeadershipRequest(t, teacherRouter, http.MethodPost, "/societies/"+society.ID.String()+"/members/"+societyMember.ID.String()+"/deactivate", DeactivateSocietyMemberRequest{})
	if again.Code != http.StatusNotFound {
		t.Fatalf("second deactivate: code=%d body=%s", again.Code, again.Body.String())
	}
	deletedSociety := performStudentLeadershipRequest(t, adminRouter, http.MethodDelete, "/societies/"+society.ID.String(), nil)
	if deletedSociety.Code != http.StatusOK {
		t.Fatalf("delete society: code=%d body=%s", deletedSociety.Code, deletedSociety.Body.String())
	}
	deletedPrefect := performStudentLeadershipRequest(t, adminRouter, http.MethodDelete, "/prefects/"+prefect.ID.String(), nil)
	if deletedPrefect.Code != http.StatusOK {
		t.Fatalf("delete prefect: code=%d body=%s", deletedPrefect.Code, deletedPrefect.Body.String())
	}
}

func studentLeadershipRouter(service *Service, userID uuid.UUID, role string) *gin.Engine {
	router := gin.New()
	group := router.Group("")
	group.Use(func(c *gin.Context) {
		c.Set("userID", userID.String())
		c.Set("roles", []string{role})
		c.Next()
	})
	RegisterRoutes(group, group, group, service)
	return router
}

func seedStudentLeadershipFixture(t *testing.T, pool *pgxpool.Pool) studentLeadershipFixture {
	t.Helper()
	ctx := context.Background()
	fixture := studentLeadershipFixture{adminUserID: uuid.New()}
	if _, err := pool.Exec(ctx, "INSERT INTO users (id, email, full_name, role) VALUES ($1, 'student-leadership-admin@example.test', 'Student Leadership Admin', 'admin')", fixture.adminUserID); err != nil {
		t.Fatal(err)
	}
	fixture.teacherUserID, fixture.teacherID = seedStudentLeadershipTeacher(t, pool, "Society Teacher", "SLEAD-TEACHER-1", "199000000011")
	fixture.otherTeacherUserID, fixture.otherTeacherID = seedStudentLeadershipTeacher(t, pool, "Other Society Teacher", "SLEAD-TEACHER-2", "199000000012")
	if err := pool.QueryRow(ctx, "INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ('2026 Student Leadership', '2026-01-01', '2026-12-31', TRUE) RETURNING id").Scan(&fixture.academicYearID); err != nil {
		t.Fatal(err)
	}
	var gradeID, classID uuid.UUID
	if err := pool.QueryRow(ctx, "INSERT INTO grades (name, sort_order) VALUES ('Student Leadership Grade 9', 9) RETURNING id").Scan(&gradeID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO classes (grade_id, academic_year_id, name) VALUES ($1, $2, 'A') RETURNING id", gradeID, fixture.academicYearID).Scan(&classID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO student_profiles (full_name, index_number) VALUES ('Leadership Student', 'SLEAD-STUDENT-1') RETURNING id").Scan(&fixture.studentID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, "INSERT INTO class_students (class_id, student_id) VALUES ($1, $2)", classID, fixture.studentID); err != nil {
		t.Fatal(err)
	}
	return fixture
}

func seedStudentLeadershipTeacher(t *testing.T, pool *pgxpool.Pool, name, employeeNumber, nicNumber string) (uuid.UUID, uuid.UUID) {
	t.Helper()
	ctx := context.Background()
	userID := uuid.New()
	if _, err := pool.Exec(ctx, "INSERT INTO users (id, email, full_name, role) VALUES ($1, $2, $3, 'teacher')", userID, employeeNumber+"@example.test", name); err != nil {
		t.Fatal(err)
	}
	var teacherID uuid.UUID
	if err := pool.QueryRow(ctx, "INSERT INTO teacher_profiles (user_id, full_name, employee_number, joined_date, nic_number) VALUES ($1, $2, $3, $4, $5) RETURNING id", userID, name, employeeNumber, time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC), nicNumber).Scan(&teacherID); err != nil {
		t.Fatal(err)
	}
	return userID, teacherID
}

func performStudentLeadershipRequest(t *testing.T, router http.Handler, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var payload []byte
	if body != nil {
		var err error
		payload, err = json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
	}
	request := httptest.NewRequest(method, path, bytes.NewReader(payload))
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}
