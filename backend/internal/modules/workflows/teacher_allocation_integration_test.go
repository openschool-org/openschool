//go:build integration

package workflows

import (
	"context"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

func TestTeacherAllocationWithPostgres(t *testing.T) {
	pool := testdb.Open(t)
	ctx := context.Background()
	q := func(sql string, args ...any) uuid.UUID {
		t.Helper()
		var id uuid.UUID
		if err := pool.QueryRow(ctx, sql, args...).Scan(&id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	admin := uuid.New()
	exec("INSERT INTO users (id, email, full_name, role) VALUES ($1, 'alloc-admin@example.test', 'Alloc Admin', 'admin')", admin)
	teacher := func(name, emp, nic string) uuid.UUID {
		user := uuid.New()
		exec("INSERT INTO users (id, email, full_name, role) VALUES ($1, $2, $3, 'teacher')", user, emp+"@example.test", name)
		return q("INSERT INTO teacher_profiles (user_id, full_name, employee_number, joined_date, nic_number) VALUES ($1, $2, $3, '2020-01-01', $4) RETURNING id", user, name, emp, nic)
	}
	y2026 := q("INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ('2026', '2026-01-01', '2026-12-31', TRUE) RETURNING id")
	y2027 := q("INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ('2027', '2027-01-01', '2027-12-31', FALSE) RETURNING id")
	g9 := q("INSERT INTO grades (name, sort_order) VALUES ('Grade 9', 9) RETURNING id")
	g10 := q("INSERT INTO grades (name, sort_order) VALUES ('Grade 10', 10) RETURNING id")
	maths := q("INSERT INTO subjects (name, code) VALUES ('Mathematics', 'MAT') RETURNING id")
	science := q("INSERT INTO subjects (name, code) VALUES ('Science', 'SCI') RETURNING id")
	nimal := teacher("Nimal Maths", "T-1", "198011111111")
	sama := teacher("Sama Both", "T-2", "198022222222")
	exec("INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $3), ($2, $3), ($2, $4)", nimal, sama, maths, science)
	class9 := q("INSERT INTO classes (grade_id, academic_year_id, name, form_teacher_id) VALUES ($1, $2, '9-A', $3) RETURNING id", g9, y2026, nimal)
	class10 := q("INSERT INTO classes (grade_id, academic_year_id, name) VALUES ($1, $2, '10-A') RETURNING id", g10, y2027)
	student := q("INSERT INTO student_profiles (full_name, index_number) VALUES ('Alloc Student', 'AL-1') RETURNING id")
	exec("INSERT INTO class_students (class_id, student_id) VALUES ($1, $3), ($2, $3)", class9, class10, student)
	exec("INSERT INTO class_subject_teachers (class_id, subject_id, teacher_id) VALUES ($1, $2, $3)", class9, maths, nimal)
	exec("INSERT INTO subject_period_requirements (academic_year_id, grade_id, subject_id, periods_per_week) VALUES ($1, $2, $3, 6), ($1, $2, $4, 5)", y2027, g10, maths, science)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("")
	group.Use(func(c *gin.Context) { c.Set("userID", admin.String()); c.Next() })
	RegisterRoutes(group, NewEngine(NewStore(pool), nil, []Definition{TeacherAllocation{}}))

	run := proposeRun(t, router, "teacher_allocation", Inputs{})
	got := map[string]string{}
	for _, r := range run.Proposal.Section("allocations").Rows {
		got[r.Cells["subject"]] = r.Cells["teacher"]
	}
	if got["Mathematics"] != nimal.String() || got["Science"] != sama.String() {
		t.Fatalf("allocations: %v (Nimal %s, Sama %s)", got, nimal, sama)
	}
	form := run.Proposal.Section("form_teachers").Rows
	if len(form) != 1 || form[0].Cells["teacher"] != nimal.String() {
		t.Fatalf("form teacher suggestion: %+v", form)
	}
	if code, body := call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/apply", nil); code != http.StatusOK {
		t.Fatalf("apply: %d %s", code, body)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM class_subject_teachers WHERE class_id = $1", class10); n != 2 {
		t.Fatalf("assignments = %d", n)
	}
	if ft := scalar[uuid.UUID](t, pool, "SELECT form_teacher_id FROM classes WHERE id = $1", class10); ft != nimal {
		t.Fatal("form teacher not set")
	}

	// A second proposal keeps what is already assigned.
	again := proposeRun(t, router, "teacher_allocation", Inputs{})
	for _, r := range again.Proposal.Section("allocations").Rows {
		if r.Reason != "Already assigned for next year." {
			t.Fatalf("existing assignment should be kept: %+v", r)
		}
	}
	if code, _ := call(t, router, http.MethodPost, "/workflow-runs/"+again.ID.String()+"/discard", nil); code != http.StatusNoContent {
		t.Fatal("discard failed")
	}

	if code, body := call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/revert", nil); code != http.StatusNoContent {
		t.Fatalf("revert: %d %s", code, body)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM class_subject_teachers WHERE class_id = $1", class10); n != 0 {
		t.Fatalf("revert left %d assignments", n)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM classes WHERE id = $1 AND form_teacher_id IS NULL", class10); n != 1 {
		t.Fatal("revert should clear the form teacher")
	}

	// Once a timetable is published, revert is refused.
	run = proposeRun(t, router, "teacher_allocation", Inputs{})
	if code, body := call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/apply", nil); code != http.StatusOK {
		t.Fatalf("re-apply: %d %s", code, body)
	}
	exec("INSERT INTO timetables (academic_year_id, class_id, status, created_by) VALUES ($1, $2, 'published', $3)", y2027, class10, admin)
	if code, _ := call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/revert", nil); code != http.StatusConflict {
		t.Fatalf("revert after publish: %d", code)
	}
}
