//go:build integration

package leadership

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
	auditmodule "github.com/openschool-org/openschool/internal/modules/audit"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

type leadershipFixture struct {
	adminID                                     uuid.UUID
	principalTeacherID, vicePrincipalTeacherID  uuid.UUID
	sectionHeadTeacherID                        uuid.UUID
	academicYearID, firstGradeID, secondGradeID uuid.UUID
	firstGradeClassID                           uuid.UUID
}

func TestLeadershipWorkflowsWithPostgres(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := testdb.Open(t)
	fixture := seedLeadershipFixture(t, pool)
	service := NewService(NewRepository(pool), auditmodule.NewService(auditmodule.NewRepository(pool)))
	router := leadershipRouter(service, fixture.adminID)

	vicePrincipal := performLeadershipRequest(t, router, http.MethodPut, "/positions/vice-principal", AssignVicePrincipalRequest{
		TeacherID: fixture.vicePrincipalTeacherID.String(), GradeIDs: []string{fixture.firstGradeID.String()},
	})
	if vicePrincipal.Code != http.StatusOK {
		t.Fatalf("assign scoped vice principal: code=%d body=%s", vicePrincipal.Code, vicePrincipal.Body.String())
	}
	var vicePosition Position
	if err := json.Unmarshal(vicePrincipal.Body.Bytes(), &vicePosition); err != nil {
		t.Fatal(err)
	}
	if vicePosition.NotifyWholeSchool {
		t.Fatalf("vice principal should be grade-scoped: %+v", vicePosition)
	}
	assertLeadershipCount(t, pool, "SELECT COUNT(*) FROM vice_principal_grade_scopes WHERE position_id = $1", 1, vicePosition.ID)

	// The scope is class-level: the one class in the vice principal's grade.
	wholeSchool, classIDs, err := service.LeadershipScope(context.Background(), fixture.vicePrincipalTeacherID, fixture.academicYearID)
	if err != nil || wholeSchool || len(classIDs) != 1 || classIDs[0] != fixture.firstGradeClassID {
		t.Fatalf("vice principal scope: whole=%t classes=%v err=%v", wholeSchool, classIDs, err)
	}
	overview, err := service.LeadershipOverview(context.Background(), fixture.vicePrincipalTeacherID, fixture.academicYearID)
	if err != nil || overview.Scope != "grades" || overview.ClassCount != 1 || overview.StudentCount != 1 || len(overview.GradeNames) != 1 || overview.GradeNames[0] != "Leadership Grade 7" {
		t.Fatalf("grade-scoped overview: %+v err=%v", overview, err)
	}

	positions := performLeadershipRequest(t, router, http.MethodGet, "/positions", nil)
	if positions.Code != http.StatusOK || !bytes.Contains(positions.Body.Bytes(), []byte(`"teacher_name":"Vice Principal Teacher"`)) {
		t.Fatalf("list positions: code=%d body=%s", positions.Code, positions.Body.String())
	}

	principal := performLeadershipRequest(t, router, http.MethodPut, "/positions/principal", AssignPrincipalRequest{TeacherID: fixture.principalTeacherID.String()})
	if principal.Code != http.StatusOK {
		t.Fatalf("assign principal: code=%d body=%s", principal.Code, principal.Body.String())
	}
	principalRank, _, err := service.RankForTeacher(context.Background(), fixture.principalTeacherID, fixture.academicYearID)
	if err != nil || principalRank != RankPrincipal {
		t.Fatalf("principal rank=%v err=%v", principalRank, err)
	}

	sectionHead := performLeadershipRequest(t, router, http.MethodPut, "/section-heads", AssignSectionHeadRequest{
		AcademicYearID: fixture.academicYearID.String(), GradeID: fixture.secondGradeID.String(), TeacherID: fixture.sectionHeadTeacherID.String(),
	})
	if sectionHead.Code != http.StatusOK {
		t.Fatalf("assign section head: code=%d body=%s", sectionHead.Code, sectionHead.Body.String())
	}
	var assignedSectionHead SectionHead
	if err := json.Unmarshal(sectionHead.Body.Bytes(), &assignedSectionHead); err != nil {
		t.Fatal(err)
	}
	sectionHeads := performLeadershipRequest(t, router, http.MethodGet, "/section-heads?academic_year_id="+fixture.academicYearID.String(), nil)
	if sectionHeads.Code != http.StatusOK || !bytes.Contains(sectionHeads.Body.Bytes(), []byte(`"grade_name":"Leadership Grade 8"`)) || !bytes.Contains(sectionHeads.Body.Bytes(), []byte(`"teacher_name":"Section Head Teacher"`)) {
		t.Fatalf("list section heads: code=%d body=%s", sectionHeads.Code, sectionHeads.Body.String())
	}
	sectionRank, _, err := service.RankForTeacher(context.Background(), fixture.sectionHeadTeacherID, fixture.academicYearID)
	if err != nil || sectionRank != RankSectionHead {
		t.Fatalf("section head rank=%v err=%v", sectionRank, err)
	}
	// The grade they head has no classes yet, so they lead none.
	wholeSchool, classIDs, err = service.LeadershipScope(context.Background(), fixture.sectionHeadTeacherID, fixture.academicYearID)
	if err != nil || wholeSchool || len(classIDs) != 0 {
		t.Fatalf("section head scope: whole=%t classes=%v err=%v", wholeSchool, classIDs, err)
	}

	deletedSectionHead := performLeadershipRequest(t, router, http.MethodDelete, "/section-heads/"+assignedSectionHead.ID.String(), nil)
	if deletedSectionHead.Code != http.StatusOK {
		t.Fatalf("delete section head: code=%d body=%s", deletedSectionHead.Code, deletedSectionHead.Body.String())
	}
	missingSectionHead := performLeadershipRequest(t, router, http.MethodDelete, "/section-heads/"+assignedSectionHead.ID.String(), nil)
	if missingSectionHead.Code != http.StatusNotFound {
		t.Fatalf("delete missing section head: code=%d body=%s", missingSectionHead.Code, missingSectionHead.Body.String())
	}

	deletedPosition := performLeadershipRequest(t, router, http.MethodDelete, "/positions/"+vicePosition.ID.String(), nil)
	if deletedPosition.Code != http.StatusOK {
		t.Fatalf("delete vice principal: code=%d body=%s", deletedPosition.Code, deletedPosition.Body.String())
	}
	assertLeadershipCount(t, pool, "SELECT COUNT(*) FROM audit_logs WHERE action IN ('assigned_vice_principal', 'assigned_principal', 'removed')", 3)
}

func leadershipRouter(service *Service, actorID uuid.UUID) *gin.Engine {
	router := gin.New()
	group := router.Group("")
	group.Use(func(c *gin.Context) {
		c.Set("userID", actorID.String())
		c.Next()
	})
	RegisterRoutes(group, group, service)
	return router
}

func seedLeadershipFixture(t *testing.T, pool *pgxpool.Pool) leadershipFixture {
	t.Helper()
	ctx := context.Background()
	fixture := leadershipFixture{adminID: uuid.New()}
	if _, err := pool.Exec(ctx, "INSERT INTO users (id, email, full_name, role) VALUES ($1, $2, $3, 'admin')", fixture.adminID, "leadership-admin@example.test", "Leadership Admin"); err != nil {
		t.Fatal(err)
	}
	fixture.principalTeacherID = seedLeadershipTeacher(t, pool, "Principal Teacher", "LEAD-PRINCIPAL", "199000000001")
	fixture.vicePrincipalTeacherID = seedLeadershipTeacher(t, pool, "Vice Principal Teacher", "LEAD-VICE", "199000000002")
	fixture.sectionHeadTeacherID = seedLeadershipTeacher(t, pool, "Section Head Teacher", "LEAD-HEAD", "199000000003")
	if err := pool.QueryRow(ctx, "INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ('2026 Leadership', '2026-01-01', '2026-12-31', TRUE) RETURNING id").Scan(&fixture.academicYearID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO grades (name, sort_order) VALUES ('Leadership Grade 7', 7) RETURNING id").Scan(&fixture.firstGradeID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO grades (name, sort_order) VALUES ('Leadership Grade 8', 8) RETURNING id").Scan(&fixture.secondGradeID); err != nil {
		t.Fatal(err)
	}
	var studentID uuid.UUID
	if err := pool.QueryRow(ctx, "INSERT INTO classes (grade_id, academic_year_id, name) VALUES ($1, $2, 'A') RETURNING id", fixture.firstGradeID, fixture.academicYearID).Scan(&fixture.firstGradeClassID); err != nil {
		t.Fatal(err)
	}
	classID := fixture.firstGradeClassID
	if err := pool.QueryRow(ctx, "INSERT INTO student_profiles (full_name, index_number) VALUES ('Leadership Student', 'LEAD-STUDENT-1') RETURNING id").Scan(&studentID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, "INSERT INTO class_students (class_id, student_id) VALUES ($1, $2)", classID, studentID); err != nil {
		t.Fatal(err)
	}
	return fixture
}

func seedLeadershipTeacher(t *testing.T, pool *pgxpool.Pool, name, employeeNumber, nicNumber string) uuid.UUID {
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
	return teacherID
}

func performLeadershipRequest(t *testing.T, router http.Handler, method, path string, body any) *httptest.ResponseRecorder {
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

func assertLeadershipCount(t *testing.T, pool *pgxpool.Pool, query string, want int, args ...any) {
	t.Helper()
	var got int
	if err := pool.QueryRow(context.Background(), query, args...).Scan(&got); err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("query count=%d, want %d: %s", got, want, query)
	}
}
