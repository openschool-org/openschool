//go:build integration

package attendance

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
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

type attendanceFixture struct {
	adminUserID, teacherUserID, otherTeacherUserID uuid.UUID
	teacherID, otherTeacherID                      uuid.UUID
	classID, studentID, guardianUserID             uuid.UUID
	nonAcademicStaffID                             uuid.UUID
}

type recordingNotifier struct {
	calls      int
	recipients []uuid.UUID
}

func (n *recordingNotifier) SendDirect(_ context.Context, _, _, _, _ string, _ uuid.UUID, recipients []uuid.UUID) error {
	n.calls++
	n.recipients = append([]uuid.UUID(nil), recipients...)
	return nil
}

type recordingAuditor struct {
	calls  int
	reason string
}

func (a *recordingAuditor) Record(_ context.Context, _ string, _ uuid.UUID, _ string, _ uuid.UUID, _, _ interface{}, reason string) error {
	a.calls++
	a.reason = reason
	return nil
}

func TestStudentAttendanceWorkflowAPIWithPostgres(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := testdb.Open(t)
	fixture := seedAttendanceFixture(t, pool)
	notifier := &recordingNotifier{}
	auditor := &recordingAuditor{}
	service := NewService(NewRepository(pool), notifier, auditor, nil)
	adminRouter := attendanceRouter(service, fixture.adminUserID, authz.RoleAdmin)
	teacherRouter := attendanceRouter(service, fixture.teacherUserID, authz.RoleTeacher)
	otherTeacherRouter := attendanceRouter(service, fixture.otherTeacherUserID, authz.RoleTeacher)

	date := "2026-09-15"
	created := performAttendanceRequest(t, adminRouter, http.MethodPost, "/attendance/sessions", CreateAttendanceSessionRequest{ClassID: fixture.classID.String(), Date: date})
	if created.Code != http.StatusCreated {
		t.Fatalf("create attendance session: code=%d body=%s", created.Code, created.Body.String())
	}
	var session Session
	if err := json.Unmarshal(created.Body.Bytes(), &session); err != nil {
		t.Fatal(err)
	}
	if session.ID == uuid.Nil || session.ClassID != fixture.classID || session.TakenBy != fixture.adminUserID {
		t.Fatalf("unexpected created session: %+v", session)
	}

	duplicate := performAttendanceRequest(t, adminRouter, http.MethodPost, "/attendance/sessions", CreateAttendanceSessionRequest{ClassID: fixture.classID.String(), Date: date})
	if duplicate.Code != http.StatusBadRequest {
		t.Fatalf("duplicate attendance session: code=%d body=%s", duplicate.Code, duplicate.Body.String())
	}

	markPath := "/attendance/sessions/" + session.ID.String() + "/records"
	marked := performAttendanceRequest(t, teacherRouter, http.MethodPost, markPath, MarkAttendanceRequest{Records: []AttendanceRecord{{StudentID: fixture.studentID.String(), Status: AttendanceStatusAbsent, Note: "unwell"}}})
	if marked.Code != http.StatusOK {
		t.Fatalf("mark attendance: code=%d body=%s", marked.Code, marked.Body.String())
	}
	assertStudentAttendance(t, pool, session.ID, fixture.studentID, AttendanceStatusAbsent, "unwell", 1)
	if notifier.calls != 1 || len(notifier.recipients) != 1 || notifier.recipients[0] != fixture.guardianUserID {
		t.Fatalf("absence notification calls=%d recipients=%v", notifier.calls, notifier.recipients)
	}

	forbidden := performAttendanceRequest(t, otherTeacherRouter, http.MethodGet, "/attendance/sessions/"+session.ID.String(), nil)
	if forbidden.Code != http.StatusForbidden {
		t.Fatalf("unassigned teacher access: code=%d body=%s", forbidden.Code, forbidden.Body.String())
	}

	if _, err := pool.Exec(context.Background(), "UPDATE attendance_sessions SET created_at = NOW() - INTERVAL '25 hours' WHERE id = $1", session.ID); err != nil {
		t.Fatal(err)
	}
	locked := performAttendanceRequest(t, teacherRouter, http.MethodPost, markPath, MarkAttendanceRequest{Records: []AttendanceRecord{{StudentID: fixture.studentID.String(), Status: AttendanceStatusPresent}}})
	if locked.Code != http.StatusLocked {
		t.Fatalf("teacher locked correction: code=%d body=%s", locked.Code, locked.Body.String())
	}
	assertStudentAttendance(t, pool, session.ID, fixture.studentID, AttendanceStatusAbsent, "unwell", 1)

	corrected := performAttendanceRequest(t, adminRouter, http.MethodPost, markPath, MarkAttendanceRequest{Records: []AttendanceRecord{{StudentID: fixture.studentID.String(), Status: AttendanceStatusPresent}}, Reason: "register correction"})
	if corrected.Code != http.StatusOK {
		t.Fatalf("admin locked correction: code=%d body=%s", corrected.Code, corrected.Body.String())
	}
	assertStudentAttendance(t, pool, session.ID, fixture.studentID, AttendanceStatusPresent, "", 1)
	if auditor.calls != 1 || auditor.reason != "register correction" {
		t.Fatalf("locked correction audit calls=%d reason=%q", auditor.calls, auditor.reason)
	}

	summary := performAttendanceRequest(t, adminRouter, http.MethodGet, "/students/"+fixture.studentID.String()+"/attendance/summary/"+fixture.classID.String(), nil)
	if summary.Code != http.StatusOK || !bytes.Contains(summary.Body.Bytes(), []byte(`"total_days":1`)) || !bytes.Contains(summary.Body.Bytes(), []byte(`"present":1`)) {
		t.Fatalf("attendance summary: code=%d body=%s", summary.Code, summary.Body.String())
	}
	byDate := performAttendanceRequest(t, adminRouter, http.MethodGet, "/attendance/sessions?date="+date, nil)
	if byDate.Code != http.StatusOK || !bytes.Contains(byDate.Body.Bytes(), []byte(`"marked_count":1`)) {
		t.Fatalf("daily attendance sessions: code=%d body=%s", byDate.Code, byDate.Body.String())
	}
}

func TestStaffAttendanceWorkflowAPIWithPostgres(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := testdb.Open(t)
	fixture := seedAttendanceFixture(t, pool)
	router := gin.New()
	admin := router.Group("")
	admin.Use(attendanceActor(fixture.adminUserID, authz.RoleAdmin))
	RegisterStaffRoutes(admin, router.Group("/teacher"), NewStaffService(NewRepository(pool)), nil)
	date := time.Date(2026, time.September, 15, 0, 0, 0, 0, time.UTC)

	teacherMark := MarkStaffAttendanceRequest{TeacherID: fixture.teacherID.String(), Date: date, Status: "present", Note: "on time"}
	marked := performAttendanceRequest(t, router, http.MethodPost, "/staff-attendance", teacherMark)
	if marked.Code != http.StatusOK {
		t.Fatalf("mark teacher attendance: code=%d body=%s", marked.Code, marked.Body.String())
	}
	teacherMark.Status = "late"
	teacherMark.Note = "traffic"
	updated := performAttendanceRequest(t, router, http.MethodPost, "/staff-attendance", teacherMark)
	if updated.Code != http.StatusOK {
		t.Fatalf("update teacher attendance: code=%d body=%s", updated.Code, updated.Body.String())
	}
	assertStaffAttendance(t, pool, "teacher_id", fixture.teacherID, "late", "traffic", 1)

	staffMark := MarkStaffAttendanceRequest{NonAcademicStaffID: fixture.nonAcademicStaffID.String(), Date: date, Status: "leave", Note: "approved"}
	staffMarked := performAttendanceRequest(t, router, http.MethodPost, "/staff-attendance", staffMark)
	if staffMarked.Code != http.StatusOK {
		t.Fatalf("mark non-academic staff attendance: code=%d body=%s", staffMarked.Code, staffMarked.Body.String())
	}
	assertStaffAttendance(t, pool, "non_academic_staff_id", fixture.nonAcademicStaffID, "leave", "approved", 1)

	ambiguous := performAttendanceRequest(t, router, http.MethodPost, "/staff-attendance", MarkStaffAttendanceRequest{TeacherID: fixture.teacherID.String(), NonAcademicStaffID: fixture.nonAcademicStaffID.String(), Date: date, Status: "present"})
	if ambiguous.Code != http.StatusBadRequest {
		t.Fatalf("ambiguous staff attendance: code=%d body=%s", ambiguous.Code, ambiguous.Body.String())
	}
	list := performAttendanceRequest(t, router, http.MethodGet, "/staff-attendance?date=2026-09-15", nil)
	if list.Code != http.StatusOK || !bytes.Contains(list.Body.Bytes(), []byte(`"status":"late"`)) || !bytes.Contains(list.Body.Bytes(), []byte(`"status":"leave"`)) {
		t.Fatalf("staff attendance directory: code=%d body=%s", list.Code, list.Body.String())
	}
	summary := performAttendanceRequest(t, router, http.MethodGet, "/staff-attendance/monthly-summary?year=2026&month=9", nil)
	if summary.Code != http.StatusOK || !bytes.Contains(summary.Body.Bytes(), []byte(`"late_count":1`)) || !bytes.Contains(summary.Body.Bytes(), []byte(`"leave_count":1`)) {
		t.Fatalf("staff attendance summary: code=%d body=%s", summary.Code, summary.Body.String())
	}
}

func TestStaffAttendanceRosterPagingWithPostgres(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := testdb.Open(t)
	fixture := seedAttendanceFixture(t, pool)
	router := gin.New()
	admin := router.Group("")
	admin.Use(attendanceActor(fixture.adminUserID, authz.RoleAdmin))
	RegisterStaffRoutes(admin, router.Group("/teacher"), NewStaffService(NewRepository(pool)), nil)
	ctx := context.Background()

	// The fixture has two teachers; two more make a page of 2 leave two over.
	for i, name := range []string{"Aruni Perera", "Zahra Nizam"} {
		var userID uuid.UUID
		if err := pool.QueryRow(ctx, "INSERT INTO users (id, email, full_name, role) VALUES (gen_random_uuid(), $1, $2, 'teacher') RETURNING id", fmt.Sprintf("roster%d@example.test", i), name).Scan(&userID); err != nil {
			t.Fatal(err)
		}
		if _, err := pool.Exec(ctx, "INSERT INTO teacher_profiles (user_id, full_name, employee_number, joined_date, nic_number) VALUES ($1, $2, $3, '2020-01-01', $4)", userID, name, fmt.Sprintf("ROS-%d", i), fmt.Sprintf("99999999%dV", i)); err != nil {
			t.Fatal(err)
		}
	}

	page := performAttendanceRequest(t, router, http.MethodGet, "/staff-attendance/roster?date=2026-09-16&kind=teacher&limit=2", nil)
	if page.Code != http.StatusOK || !bytes.Contains(page.Body.Bytes(), []byte(`"total":4`)) || !bytes.Contains(page.Body.Bytes(), []byte(`"unmarked":4`)) {
		t.Fatalf("roster page: code=%d body=%s", page.Code, page.Body.String())
	}
	search := performAttendanceRequest(t, router, http.MethodGet, "/staff-attendance/roster?date=2026-09-16&kind=teacher&search=zahra", nil)
	if search.Code != http.StatusOK || !bytes.Contains(search.Body.Bytes(), []byte(`"total":1`)) {
		t.Fatalf("roster search: code=%d body=%s", search.Code, search.Body.String())
	}

	// One teacher is marked absent first; the bulk action must not overwrite that.
	absent := MarkStaffAttendanceRequest{TeacherID: fixture.teacherID.String(), Date: time.Date(2026, time.September, 16, 0, 0, 0, 0, time.UTC), Status: "absent"}
	if res := performAttendanceRequest(t, router, http.MethodPost, "/staff-attendance", absent); res.Code != http.StatusOK {
		t.Fatalf("mark absent: code=%d body=%s", res.Code, res.Body.String())
	}
	bulk := performAttendanceRequest(t, router, http.MethodPost, "/staff-attendance/mark-unmarked", MarkUnmarkedRequest{Date: absent.Date, Kind: StaffKindTeacher})
	if bulk.Code != http.StatusOK || !bytes.Contains(bulk.Body.Bytes(), []byte(`"marked":3`)) {
		t.Fatalf("mark unmarked: code=%d body=%s", bulk.Code, bulk.Body.String())
	}
	after := performAttendanceRequest(t, router, http.MethodGet, "/staff-attendance/roster?date=2026-09-16&kind=teacher", nil)
	if !bytes.Contains(after.Body.Bytes(), []byte(`"present":3`)) || !bytes.Contains(after.Body.Bytes(), []byte(`"absent":1`)) || !bytes.Contains(after.Body.Bytes(), []byte(`"unmarked":0`)) {
		t.Fatalf("roster after bulk: body=%s", after.Body.String())
	}

	monthly := performAttendanceRequest(t, router, http.MethodGet, "/staff-attendance/monthly?year=2026&month=9&kind=teacher&limit=10", nil)
	if monthly.Code != http.StatusOK || !bytes.Contains(monthly.Body.Bytes(), []byte(`"total":4`)) {
		t.Fatalf("monthly page: code=%d body=%s", monthly.Code, monthly.Body.String())
	}
	bad := performAttendanceRequest(t, router, http.MethodGet, "/staff-attendance/roster?date=2026-09-16&kind=students", nil)
	if bad.Code != http.StatusBadRequest {
		t.Fatalf("bad kind: code=%d", bad.Code)
	}
}

func attendanceRouter(service *Service, userID uuid.UUID, role string) *gin.Engine {
	router := gin.New()
	group := router.Group("")
	group.Use(attendanceActor(userID, role))
	RegisterRoutes(group, service)
	return router
}

func attendanceActor(userID uuid.UUID, role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("userID", userID.String())
		c.Set("roles", []string{role})
		c.Set("email", role+"@example.test")
		c.Set("given_name", "Integration")
		c.Set("family_name", "Actor")
		c.Next()
	}
}

func seedAttendanceFixture(t *testing.T, pool *pgxpool.Pool) attendanceFixture {
	t.Helper()
	ctx := context.Background()
	f := attendanceFixture{adminUserID: uuid.New(), teacherUserID: uuid.New(), otherTeacherUserID: uuid.New(), guardianUserID: uuid.New()}
	users := []struct {
		id                uuid.UUID
		email, name, role string
	}{
		{f.adminUserID, "attendance-admin@example.test", "Attendance Admin", authz.RoleAdmin},
		{f.teacherUserID, "attendance-teacher@example.test", "Assigned Teacher", authz.RoleTeacher},
		{f.otherTeacherUserID, "other-attendance-teacher@example.test", "Other Teacher", authz.RoleTeacher},
		{f.guardianUserID, "attendance-parent@example.test", "Attendance Parent", authz.RoleParent},
	}
	for _, user := range users {
		if _, err := pool.Exec(ctx, "INSERT INTO users (id, email, full_name, role) VALUES ($1, $2, $3, $4)", user.id, user.email, user.name, user.role); err != nil {
			t.Fatal(err)
		}
	}
	if err := pool.QueryRow(ctx, "INSERT INTO teacher_profiles (user_id, full_name, employee_number, joined_date, nic_number) VALUES ($1, 'Assigned Teacher', 'ATT-T-001', '2020-01-01', 'ATT-NIC-T-001') RETURNING id", f.teacherUserID).Scan(&f.teacherID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO teacher_profiles (user_id, full_name, employee_number, joined_date, nic_number) VALUES ($1, 'Other Teacher', 'ATT-T-002', '2020-01-01', 'ATT-NIC-T-002') RETURNING id", f.otherTeacherUserID).Scan(&f.otherTeacherID); err != nil {
		t.Fatal(err)
	}
	var yearID, gradeID uuid.UUID
	if err := pool.QueryRow(ctx, "INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ('2026', '2026-01-01', '2026-12-31', TRUE) RETURNING id").Scan(&yearID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO grades (name, sort_order) VALUES ('Grade 9', 9) RETURNING id").Scan(&gradeID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO classes (grade_id, academic_year_id, form_teacher_id, name) VALUES ($1, $2, $3, 'A') RETURNING id", gradeID, yearID, f.teacherID).Scan(&f.classID); err != nil {
		t.Fatal(err)
	}
	studentUserID := uuid.New()
	if _, err := pool.Exec(ctx, "INSERT INTO users (id, email, full_name, role) VALUES ($1, 'attendance-student@example.test', 'Attendance Student', 'student')", studentUserID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO student_profiles (user_id, full_name, index_number) VALUES ($1, 'Attendance Student', 'ATT-S-001') RETURNING id", studentUserID).Scan(&f.studentID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, "INSERT INTO class_students (class_id, student_id) VALUES ($1, $2)", f.classID, f.studentID); err != nil {
		t.Fatal(err)
	}
	var guardianID uuid.UUID
	if err := pool.QueryRow(ctx, "INSERT INTO guardians (user_id, full_name, relationship, phone, email, nic_number) VALUES ($1, 'Attendance Parent', 'guardian', '0770000000', 'attendance-parent@example.test', 'ATT-NIC-G-001') RETURNING id", f.guardianUserID).Scan(&guardianID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, "INSERT INTO student_guardians (student_id, guardian_id, is_primary_contact) VALUES ($1, $2, TRUE)", f.studentID, guardianID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO non_academic_staff (full_name, employee_number, designation, joined_date) VALUES ('Office Member', 'ATT-N-001', 'office_staff', '2021-01-01') RETURNING id").Scan(&f.nonAcademicStaffID); err != nil {
		t.Fatal(err)
	}
	return f
}

func performAttendanceRequest(t *testing.T, router http.Handler, method, path string, body any) *httptest.ResponseRecorder {
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

func assertStudentAttendance(t *testing.T, pool *pgxpool.Pool, sessionID, studentID uuid.UUID, wantStatus, wantNote string, wantCount int) {
	t.Helper()
	var count int
	var status, note string
	if err := pool.QueryRow(context.Background(), "SELECT COUNT(*) OVER (), status, COALESCE(note, '') FROM attendance_records WHERE session_id = $1 AND student_id = $2", sessionID, studentID).Scan(&count, &status, &note); err != nil {
		t.Fatal(err)
	}
	if count != wantCount || status != wantStatus || note != wantNote {
		t.Fatalf("attendance count=%d status=%q note=%q; want %d, %q, %q", count, status, note, wantCount, wantStatus, wantNote)
	}
}

func assertStaffAttendance(t *testing.T, pool *pgxpool.Pool, column string, staffID uuid.UUID, wantStatus, wantNote string, wantCount int) {
	t.Helper()
	query := "SELECT COUNT(*) OVER (), status, COALESCE(note, '') FROM staff_attendance_records WHERE " + column + " = $1"
	var count int
	var status, note string
	if err := pool.QueryRow(context.Background(), query, staffID).Scan(&count, &status, &note); err != nil {
		t.Fatal(err)
	}
	if count != wantCount || status != wantStatus || note != wantNote {
		t.Fatalf("staff attendance count=%d status=%q note=%q; want %d, %q, %q", count, status, note, wantCount, wantStatus, wantNote)
	}
}
