//go:build integration

package leave

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	auditmodule "github.com/openschool-org/openschool/internal/modules/audit"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

type leaveFixture struct {
	pool                                 *pgxpool.Pool
	adminID                              uuid.UUID
	principal, vice, applicant, reliever leaveTeacher
	classID, subjectID                   uuid.UUID
}

type leaveTeacher struct{ userID, teacherID uuid.UUID }

func TestLeaveWorkflowWithPostgres(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := testdb.Open(t)
	f := seedLeaveFixture(t, pool)
	notifier := &recordingNotifier{}
	years := sqlYears{pool}
	service := NewService(NewRepository(pool), sqlApprovers{pool}, sqlAttendance{pool}, notifier, years, auditmodule.NewService(auditmodule.NewRepository(pool)))
	router := gin.New()
	group := router.Group("")
	group.Use(func(c *gin.Context) {
		c.Set("userID", c.GetHeader("X-User"))
		c.Set("roles", []string{c.GetHeader("X-Role")})
		c.Next()
	})
	RegisterRoutes(group, group, service, sqlTeachers{pool})
	call := func(user uuid.UUID, role, method, path string, body any) *httptest.ResponseRecorder {
		t.Helper()
		var payload []byte
		if body != nil {
			payload, _ = json.Marshal(body)
		}
		request := httptest.NewRequest(method, path, bytes.NewReader(payload))
		request.Header.Set("X-User", user.String())
		request.Header.Set("X-Role", role)
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		return response
	}
	expect := func(r *httptest.ResponseRecorder, code int, step string) {
		t.Helper()
		if r.Code != code {
			t.Fatalf("%s: code=%d want %d body=%s", step, r.Code, code, r.Body.String())
		}
	}

	// Monday 2026-10-05: the applicant teaches period 1 (morning) and period 5 (afternoon).
	periods := call(f.applicant.userID, "teacher", http.MethodGet, "/me/teacher/leave/periods?leave_type=casual&start_date=2026-10-05&end_date=2026-10-05&day_part=afternoon", nil)
	expect(periods, http.StatusOK, "afternoon periods")
	var affected AffectedPeriods
	_ = json.Unmarshal(periods.Body.Bytes(), &affected)
	if len(affected.Items) != 1 || affected.Items[0].PeriodNumber != 5 || affected.Items[0].StartTime != "11:20" {
		t.Fatalf("afternoon periods = %+v", affected)
	}

	candidates := call(f.applicant.userID, "teacher", http.MethodGet, "/leave/relief-candidates?date=2026-10-05&period_number=1", nil)
	expect(candidates, http.StatusOK, "relief candidates")
	if strings.Contains(candidates.Body.String(), f.applicant.teacherID.String()) || !strings.Contains(candidates.Body.String(), f.reliever.teacherID.String()) {
		t.Fatalf("relief candidates = %s", candidates.Body.String())
	}

	applied := call(f.applicant.userID, "teacher", http.MethodPost, "/me/teacher/leave", ApplyRequest{
		LeaveType: TypeCasual, StartDate: "2026-10-05", EndDate: "2026-10-05", Reason: "Family matter",
		Relief: []ReliefInput{
			{Date: "2026-10-05", PeriodNumber: 1, ClassID: f.classID.String(), SubjectID: f.subjectID.String(), ReliefTeacherID: f.reliever.teacherID.String()},
			{Date: "2026-10-05", PeriodNumber: 5, ClassID: f.classID.String(), SubjectID: f.subjectID.String()},
		},
	})
	expect(applied, http.StatusCreated, "apply")
	var request RequestDetail
	_ = json.Unmarshal(applied.Body.Bytes(), &request)
	if request.Days != 1 || request.Status != StatusPending || len(request.Relief) != 2 || notifier.lastTitle != "Leave application" {
		t.Fatalf("applied = %+v notified=%q", request, notifier.lastTitle)
	}

	overlap := call(f.applicant.userID, "teacher", http.MethodPost, "/me/teacher/leave", ApplyRequest{LeaveType: TypeSick, StartDate: "2026-10-05", EndDate: "2026-10-06", Reason: "Fever"})
	expect(overlap, http.StatusBadRequest, "overlapping application")
	tooMuch := call(f.applicant.userID, "teacher", http.MethodPost, "/me/teacher/leave", ApplyRequest{LeaveType: TypeCasual, StartDate: "2026-11-02", EndDate: "2026-12-01", Reason: "Travel"})
	expect(tooMuch, http.StatusBadRequest, "over the casual allowance")

	expect(call(f.reliever.userID, "teacher", http.MethodGet, "/leave/requests?year=2026", nil), http.StatusForbidden, "register as a plain teacher")
	register := call(f.vice.userID, "teacher", http.MethodGet, "/leave/requests?year=2026&status=pending", nil)
	expect(register, http.StatusOK, "register as vice principal")
	if !strings.Contains(register.Body.String(), `"total":1`) {
		t.Fatalf("register = %s", register.Body.String())
	}

	id := request.ID.String()
	expect(call(f.vice.userID, "teacher", http.MethodPost, "/leave/requests/"+id+"/reject", DecisionRequest{}), http.StatusBadRequest, "reject without a note")
	expect(call(f.vice.userID, "teacher", http.MethodPost, "/leave/requests/"+id+"/approve", DecisionRequest{Note: "Relief arranged"}), http.StatusOK, "approve")
	expect(call(f.principal.userID, "teacher", http.MethodPost, "/leave/requests/"+id+"/approve", DecisionRequest{}), http.StatusConflict, "approve twice")
	assertLeaveCount(t, pool, "SELECT COUNT(*) FROM staff_attendance_records WHERE teacher_id = $1 AND date = '2026-10-05' AND status = 'leave'", 1, f.applicant.teacherID)
	if notifier.lastTitle != "Relief duty" || len(notifier.lastUsers) != 1 || notifier.lastUsers[0] != f.reliever.userID {
		t.Fatalf("relief notification = %q %v", notifier.lastTitle, notifier.lastUsers)
	}

	duties := call(f.reliever.userID, "teacher", http.MethodGet, "/me/teacher/leave/relief-duties?from=2026-10-01", nil)
	expect(duties, http.StatusOK, "relief duties")
	if !strings.Contains(duties.Body.String(), `"period_number":1`) {
		t.Fatalf("relief duties = %s", duties.Body.String())
	}
	sheet := call(f.adminID, "admin", http.MethodGet, "/leave/relief?date=2026-10-05", nil)
	expect(sheet, http.StatusOK, "relief sheet")
	if !strings.Contains(sheet.Body.String(), `"period_number":5`) {
		t.Fatalf("relief sheet = %s", sheet.Body.String())
	}

	balance := call(f.applicant.userID, "teacher", http.MethodGet, "/me/teacher/leave/balance?year=2026", nil)
	expect(balance, http.StatusOK, "balance")
	if !strings.Contains(balance.Body.String(), `{"leave_type":"casual","entitlement":21,"used":1,"pending":0,"remaining":20}`) {
		t.Fatalf("balance = %s", balance.Body.String())
	}

	short := ApplyRequest{LeaveType: TypeShort, StartDate: "2026-10-07", EndDate: "2026-10-07", StartTime: "12:00", EndTime: "13:30", Reason: "Bank"}
	expect(call(f.applicant.userID, "teacher", http.MethodPost, "/me/teacher/leave", short), http.StatusCreated, "first short leave")
	short.StartDate, short.EndDate = "2026-10-08", "2026-10-08"
	expect(call(f.applicant.userID, "teacher", http.MethodPost, "/me/teacher/leave", short), http.StatusCreated, "second short leave")
	short.StartDate, short.EndDate = "2026-10-09", "2026-10-09"
	expect(call(f.applicant.userID, "teacher", http.MethodPost, "/me/teacher/leave", short), http.StatusBadRequest, "third short leave in a month")

	principalLeave := call(f.principal.userID, "teacher", http.MethodPost, "/me/teacher/leave", ApplyRequest{LeaveType: TypeDuty, StartDate: "2026-10-12", EndDate: "2026-10-13", Reason: "Zonal meeting"})
	expect(principalLeave, http.StatusCreated, "principal applies")
	var principalRequest RequestDetail
	_ = json.Unmarshal(principalLeave.Body.Bytes(), &principalRequest)
	pid := principalRequest.ID.String()
	expect(call(f.principal.userID, "teacher", http.MethodPost, "/leave/requests/"+pid+"/approve", DecisionRequest{}), http.StatusForbidden, "principal approves own leave")
	expect(call(f.vice.userID, "teacher", http.MethodPost, "/leave/requests/"+pid+"/approve", DecisionRequest{}), http.StatusForbidden, "vice principal approves the principal")
	expect(call(f.adminID, "admin", http.MethodPost, "/leave/requests/"+pid+"/approve", DecisionRequest{}), http.StatusOK, "admin records the principal's approval")

	pending := call(f.reliever.userID, "teacher", http.MethodPost, "/me/teacher/leave", ApplyRequest{LeaveType: TypeSick, StartDate: "2026-10-14", EndDate: "2026-10-14", Reason: "Unwell"})
	expect(pending, http.StatusCreated, "reliever applies")
	var pendingRequest RequestDetail
	_ = json.Unmarshal(pending.Body.Bytes(), &pendingRequest)
	expect(call(f.applicant.userID, "teacher", http.MethodPost, "/me/teacher/leave/"+pendingRequest.ID.String()+"/cancel", nil), http.StatusConflict, "cancel someone else's leave")
	expect(call(f.reliever.userID, "teacher", http.MethodPost, "/me/teacher/leave/"+pendingRequest.ID.String()+"/cancel", nil), http.StatusOK, "cancel own pending leave")

	balances := call(f.principal.userID, "teacher", http.MethodGet, "/leave/balances?year=2026", nil)
	expect(balances, http.StatusOK, "balances register")
	if !strings.Contains(balances.Body.String(), `"total":4`) {
		t.Fatalf("balances = %s", balances.Body.String())
	}
}

func seedLeaveFixture(t *testing.T, pool *pgxpool.Pool) leaveFixture {
	t.Helper()
	ctx := context.Background()
	q := func(query string, args ...any) uuid.UUID {
		t.Helper()
		var id uuid.UUID
		if err := pool.QueryRow(ctx, query, args...).Scan(&id); err != nil {
			t.Fatalf("%s: %v", query, err)
		}
		return id
	}
	f := leaveFixture{pool: pool, adminID: uuid.New()}
	if _, err := pool.Exec(ctx, "INSERT INTO users (id, email, full_name, role) VALUES ($1, 'leave-admin@example.test', 'Leave Admin', 'admin')", f.adminID); err != nil {
		t.Fatal(err)
	}
	teacher := func(name, number, nic string) leaveTeacher {
		user := uuid.New()
		if _, err := pool.Exec(ctx, "INSERT INTO users (id, email, full_name, role) VALUES ($1, $2, $3, 'teacher')", user, number+"@example.test", name); err != nil {
			t.Fatal(err)
		}
		return leaveTeacher{userID: user, teacherID: q("INSERT INTO teacher_profiles (user_id, full_name, employee_number, joined_date, nic_number) VALUES ($1, $2, $3, '2020-01-01', $4) RETURNING id", user, name, number, nic)}
	}
	f.principal = teacher("Leave Principal", "LV-P", "199100000001")
	f.vice = teacher("Leave Vice", "LV-V", "199100000002")
	f.applicant = teacher("Leave Applicant", "LV-A", "199100000003")
	f.reliever = teacher("Leave Reliever", "LV-R", "199100000004")
	q("INSERT INTO teacher_positions (teacher_id, position) VALUES ($1, 'principal') RETURNING id", f.principal.teacherID)
	q("INSERT INTO teacher_positions (teacher_id, position, notify_whole_school) VALUES ($1, 'vice_principal', TRUE) RETURNING id", f.vice.teacherID)

	year := q("INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ('2026 Leave', '2026-01-01', '2026-12-31', TRUE) RETURNING id")
	grade := q("INSERT INTO grades (name, sort_order) VALUES ('Leave Grade 9', 9) RETURNING id")
	f.classID = q("INSERT INTO classes (grade_id, academic_year_id, name) VALUES ($1, $2, 'A') RETURNING id", grade, year)
	f.subjectID = q("INSERT INTO subjects (name, code) VALUES ('Leave Science', 'LV-SCI') RETURNING id")
	section := q("INSERT INTO grade_sections (academic_year_id, name, interval_start_time, interval_end_time) VALUES ($1, 'Leave Senior', '10:30', '10:50') RETURNING id", year)
	if _, err := pool.Exec(ctx, "INSERT INTO grade_section_grades (grade_section_id, grade_id, academic_year_id) VALUES ($1, $2, $3)", section, grade, year); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO timetable_periods (grade_section_id, sort_order, period_number, start_time, end_time, slot_type) VALUES
		($1, 1, 1, '07:50', '08:30', 'period'), ($1, 5, NULL, '10:30', '10:50', 'interval'), ($1, 6, 5, '11:20', '12:00', 'period')`, section); err != nil {
		t.Fatal(err)
	}
	timetable := q("INSERT INTO timetables (academic_year_id, class_id, status, created_by) VALUES ($1, $2, 'published', $3) RETURNING id", year, f.classID, f.adminID)
	if _, err := pool.Exec(ctx, "INSERT INTO timetable_entries (timetable_id, day_of_week, period_number, subject_id, teacher_id) VALUES ($1, 1, 1, $2, $3), ($1, 1, 5, $2, $3)", timetable, f.subjectID, f.applicant.teacherID); err != nil {
		t.Fatal(err)
	}
	return f
}

type sqlTeachers struct{ pool *pgxpool.Pool }

func (s sqlTeachers) Resolve(ctx context.Context, userID uuid.UUID) (uuid.UUID, error) {
	var id uuid.UUID
	err := s.pool.QueryRow(ctx, "SELECT id FROM teacher_profiles WHERE user_id = $1", userID).Scan(&id)
	return id, err
}

type sqlYears struct{ pool *pgxpool.Pool }

func (s sqlYears) CurrentAcademicYearID(ctx context.Context) (uuid.UUID, error) {
	var id uuid.UUID
	err := s.pool.QueryRow(ctx, "SELECT id FROM academic_years WHERE is_current").Scan(&id)
	return id, err
}

type sqlApprovers struct{ pool *pgxpool.Pool }

func (s sqlApprovers) LeaveRank(ctx context.Context, teacherID uuid.UUID) (ApproverRank, error) {
	var position string
	err := s.pool.QueryRow(ctx, "SELECT COALESCE(MIN(position), '') FROM teacher_positions WHERE teacher_id = $1", teacherID).Scan(&position)
	switch position {
	case "principal":
		return Principal, err
	case "vice_principal":
		return VicePrincipal, err
	}
	return NotApprover, err
}

type sqlAttendance struct{ pool *pgxpool.Pool }

func (s sqlAttendance) MarkTeacherOnLeave(ctx context.Context, teacherID uuid.UUID, date time.Time, note string, markedBy uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `INSERT INTO staff_attendance_records (teacher_id, date, status, marked_by, note) VALUES ($1, $2, 'leave', $3, $4)
		ON CONFLICT (teacher_id, date) WHERE teacher_id IS NOT NULL DO UPDATE SET status = 'leave', note = $4`, teacherID, date, markedBy, note)
	return err
}

type recordingNotifier struct {
	lastTitle string
	lastUsers []uuid.UUID
}

func (n *recordingNotifier) SendDirect(_ context.Context, title, _, _, _ string, _ uuid.UUID, users []uuid.UUID) error {
	n.lastTitle, n.lastUsers = title, users
	return nil
}

func assertLeaveCount(t *testing.T, pool *pgxpool.Pool, query string, want int, args ...any) {
	t.Helper()
	var got int
	if err := pool.QueryRow(context.Background(), query, args...).Scan(&got); err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("query count=%d, want %d: %s", got, want, query)
	}
}
