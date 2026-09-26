//go:build integration

package workflows

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

type yearEndFixture struct {
	admin, year2026, grade6, grade13, class6A, class13A, student6, student13 uuid.UUID
}

func seedYearEnd(t *testing.T, pool *pgxpool.Pool) yearEndFixture {
	t.Helper()
	ctx := context.Background()
	var f yearEndFixture
	must := func(err error) {
		t.Helper()
		if err != nil {
			t.Fatal(err)
		}
	}
	f.admin = uuid.New()
	_, err := pool.Exec(ctx, "INSERT INTO users (id, email, full_name, role) VALUES ($1, 'yearend-admin@example.test', 'Year End Admin', 'admin')", f.admin)
	must(err)
	must(pool.QueryRow(ctx, "INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ('2026', '2026-01-01', '2026-12-31', TRUE) RETURNING id").Scan(&f.year2026))
	_, err = pool.Exec(ctx, "INSERT INTO terms (academic_year_id, name, start_date, end_date, sort_order, is_current) VALUES ($1, 'Term 1', '2026-01-05', '2026-04-10', 0, TRUE), ($1, 'Term 2', '2026-05-04', '2026-08-07', 1, FALSE)", f.year2026)
	must(err)
	must(pool.QueryRow(ctx, "INSERT INTO grades (name, sort_order) VALUES ('Grade 6', 6) RETURNING id").Scan(&f.grade6))
	must(pool.QueryRow(ctx, "INSERT INTO grades (name, sort_order) VALUES ('Grade 13', 13) RETURNING id").Scan(&f.grade13))
	var room uuid.UUID
	must(pool.QueryRow(ctx, "INSERT INTO classrooms (name, room_type) VALUES ('6-A', 'regular') RETURNING id").Scan(&room))
	must(pool.QueryRow(ctx, "INSERT INTO classes (grade_id, academic_year_id, name, home_classroom_id) VALUES ($1, $2, '6-A', $3) RETURNING id", f.grade6, f.year2026, room).Scan(&f.class6A))
	must(pool.QueryRow(ctx, "INSERT INTO classes (grade_id, academic_year_id, name) VALUES ($1, $2, '13-A') RETURNING id", f.grade13, f.year2026).Scan(&f.class13A))
	must(pool.QueryRow(ctx, "INSERT INTO student_profiles (full_name, index_number) VALUES ('Nimal Perera', 'YE-6') RETURNING id").Scan(&f.student6))
	must(pool.QueryRow(ctx, "INSERT INTO student_profiles (full_name, index_number) VALUES ('Kamala Silva', 'YE-13') RETURNING id").Scan(&f.student13))
	_, err = pool.Exec(ctx, "INSERT INTO class_students (class_id, student_id) VALUES ($1, $2), ($3, $4)", f.class6A, f.student6, f.class13A, f.student13)
	must(err)
	var section uuid.UUID
	must(pool.QueryRow(ctx, "INSERT INTO grade_sections (academic_year_id, name, interval_start_time, interval_end_time, sort_order) VALUES ($1, 'Junior', '10:30', '10:50', 0) RETURNING id", f.year2026).Scan(&section))
	_, err = pool.Exec(ctx, "INSERT INTO grade_section_grades (grade_section_id, grade_id, academic_year_id) VALUES ($1, $2, $3)", section, f.grade6, f.year2026)
	must(err)
	_, err = pool.Exec(ctx, "INSERT INTO timetable_periods (grade_section_id, sort_order, period_number, start_time, end_time, slot_type) VALUES ($1, 0, 1, '07:30', '08:10', 'period')", section)
	must(err)
	return f
}

func workflowRouter(pool *pgxpool.Pool, actor uuid.UUID) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("")
	group.Use(func(c *gin.Context) {
		c.Set("userID", actor.String())
		c.Set("roles", []string{"admin"})
		c.Next()
	})
	RegisterRoutes(group, NewEngine(NewStore(pool), nil, []Definition{YearRollover{}, Leavers{}, NewGoLive(nil)}))
	return router
}

func call(t *testing.T, router http.Handler, method, path string, body any) (int, []byte) {
	t.Helper()
	var payload []byte
	if body != nil {
		payload, _ = json.Marshal(body)
	}
	req := httptest.NewRequest(method, path, bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)
	return res.Code, res.Body.Bytes()
}

func proposeRun(t *testing.T, router http.Handler, key string, inputs Inputs) RunRecord {
	t.Helper()
	code, body := call(t, router, http.MethodPost, "/workflows/"+key+"/runs", map[string]any{"inputs": inputs})
	if code != http.StatusCreated {
		t.Fatalf("propose %s: code=%d body=%s", key, code, body)
	}
	var out struct{ Run RunRecord }
	if err := json.Unmarshal(body, &out); err != nil {
		t.Fatal(err)
	}
	return out.Run
}

func scalar[T any](t *testing.T, pool *pgxpool.Pool, sql string, args ...any) T {
	t.Helper()
	var v T
	if err := pool.QueryRow(context.Background(), sql, args...).Scan(&v); err != nil {
		t.Fatal(err)
	}
	return v
}

func TestYearEndWorkflowsWithPostgres(t *testing.T) {
	pool := testdb.Open(t)
	f := seedYearEnd(t, pool)
	router := workflowRouter(pool, f.admin)

	code, body := call(t, router, http.MethodGet, "/workflows", nil)
	if code != http.StatusOK || !bytes.Contains(body, []byte(`"key":"year_rollover"`)) || !bytes.Contains(body, []byte(`"name":"copy_classes"`)) || !bytes.Contains(body, []byte(`"default":"2027"`)) {
		t.Fatalf("catalog: code=%d body=%s", code, body)
	}

	// A taken year name blocks the proposal with the failed check.
	code, body = call(t, router, http.MethodPost, "/workflows/year_rollover/runs", map[string]any{"inputs": Inputs{"label": "2026"}})
	if code != http.StatusConflict || !bytes.Contains(body, []byte(`"key":"label_free","title":"The new year name is not used yet","ok":false`)) {
		t.Fatalf("taken label: code=%d body=%s", code, body)
	}

	// W1: roll over, leaving 13-A out by hand.
	run := proposeRun(t, router, "year_rollover", Inputs{})
	if len(run.Proposal.Section("classes").Rows) != 2 || len(run.Trace) != 3 {
		t.Fatalf("rollover proposal: %+v", run)
	}
	if code, body = call(t, router, http.MethodPatch, "/workflow-runs/"+run.ID.String()+"/rows", editRequest{Section: "classes", RowID: f.class13A.String(), Cells: map[string]string{"include": "maybe"}}); code != http.StatusBadRequest {
		t.Fatalf("invalid boolean edit: code=%d body=%s", code, body)
	}
	if code, body = call(t, router, http.MethodPatch, "/workflow-runs/"+run.ID.String()+"/rows", editRequest{Section: "classes", RowID: f.class13A.String(), Cells: map[string]string{"include": "false"}}); code != http.StatusOK {
		t.Fatalf("edit: code=%d body=%s", code, body)
	}
	if code, body = call(t, router, http.MethodPatch, "/workflow-runs/"+run.ID.String()+"/rows", editRequest{Section: "classes", RowID: f.class13A.String(), Cells: map[string]string{"grade": "x"}}); code != http.StatusBadRequest {
		t.Fatalf("read-only edit: code=%d body=%s", code, body)
	}
	if code, body = call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/apply", nil); code != http.StatusOK || !bytes.Contains(body, []byte(`"state":"applied"`)) {
		t.Fatalf("apply rollover: code=%d body=%s", code, body)
	}
	year2027 := scalar[uuid.UUID](t, pool, "SELECT id FROM academic_years WHERE label = '2027'")
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM classes WHERE academic_year_id = $1", year2027); n != 1 {
		t.Fatalf("classes copied = %d, want 1", n)
	}
	if room := scalar[uuid.UUID](t, pool, "SELECT home_classroom_id FROM classes WHERE academic_year_id = $1", year2027); room != scalar[uuid.UUID](t, pool, "SELECT home_classroom_id FROM classes WHERE id = $1", f.class6A) {
		t.Fatal("homeroom should be reused, not duplicated")
	}
	if start := scalar[string](t, pool, "SELECT start_date::text FROM terms WHERE academic_year_id = $1 AND name = 'Term 1'", year2027); start != "2027-01-05" {
		t.Fatalf("term date shifted to %s", start)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM timetable_periods p JOIN grade_sections s ON s.id = p.grade_section_id WHERE s.academic_year_id = $1", year2027); n != 1 {
		t.Fatalf("periods copied = %d", n)
	}
	if code, _ = call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/apply", nil); code != http.StatusConflict {
		t.Fatalf("second apply should conflict, got %d", code)
	}

	// Revert removes the year again; a fresh rollover then applies cleanly.
	if code, body = call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/revert", nil); code != http.StatusNoContent {
		t.Fatalf("revert rollover: code=%d body=%s", code, body)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM academic_years WHERE label = '2027'"); n != 0 {
		t.Fatal("revert left the year behind")
	}
	run = proposeRun(t, router, "year_rollover", Inputs{})
	if code, body = call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/apply", nil); code != http.StatusOK {
		t.Fatalf("re-apply rollover: code=%d body=%s", code, body)
	}
	year2027 = scalar[uuid.UUID](t, pool, "SELECT id FROM academic_years WHERE label = '2027'")

	// W2: grade 13 is the final grade, so its student is ticked by default.
	leavers := proposeRun(t, router, "leavers", Inputs{"grades": f.grade13.String() + "," + f.grade6.String()})
	rows := leavers.Proposal.Section("students").Rows
	if len(rows) != 2 {
		t.Fatalf("leaver rows = %d", len(rows))
	}
	for _, r := range rows {
		if want := r.ID == f.student13.String(); (r.Cells["leaving"] == "true") != want {
			t.Fatalf("default tick wrong for %s: %v", r.Cells["name"], r.Cells)
		}
	}
	if code, body = call(t, router, http.MethodPost, "/workflow-runs/"+leavers.ID.String()+"/apply", nil); code != http.StatusOK {
		t.Fatalf("apply leavers: code=%d body=%s", code, body)
	}
	if status := scalar[string](t, pool, "SELECT enrollment_status FROM student_profiles WHERE id = $1", f.student13); status != "left" {
		t.Fatalf("grade 13 student status = %s", status)
	}
	if code, _ = call(t, router, http.MethodPost, "/workflow-runs/"+leavers.ID.String()+"/revert", nil); code != http.StatusNoContent {
		t.Fatalf("revert leavers: %d", code)
	}
	if status := scalar[string](t, pool, "SELECT enrollment_status FROM student_profiles WHERE id = $1", f.student13); status != "active" {
		t.Fatalf("revert left status = %s", status)
	}

	// W8: go live switches the current year and term, and revert switches back.
	golive := proposeRun(t, router, "go_live", Inputs{"target_year": year2027.String(), "notify": "false"})
	if len(golive.Proposal.Warnings) == 0 {
		t.Fatal("expected a warning about unpublished timetables")
	}
	if code, body = call(t, router, http.MethodPost, "/workflow-runs/"+golive.ID.String()+"/apply", nil); code != http.StatusOK {
		t.Fatalf("apply go live: code=%d body=%s", code, body)
	}
	if cur := scalar[uuid.UUID](t, pool, "SELECT id FROM academic_years WHERE is_current"); cur != year2027 {
		t.Fatal("2027 should be current")
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM terms WHERE is_current AND academic_year_id = $1", year2027); n != 1 {
		t.Fatal("the first 2027 term should be current")
	}
	if code, _ = call(t, router, http.MethodPost, "/workflow-runs/"+golive.ID.String()+"/revert", nil); code != http.StatusNoContent {
		t.Fatalf("revert go live: %d", code)
	}
	if cur := scalar[uuid.UUID](t, pool, "SELECT id FROM academic_years WHERE is_current"); cur != f.year2026 {
		t.Fatal("revert should restore 2026 as current")
	}

	code, body = call(t, router, http.MethodGet, "/workflows/year_rollover/runs", nil)
	if code != http.StatusOK || !bytes.Contains(body, []byte(`"state":"reverted"`)) || !bytes.Contains(body, []byte(`"created_by_name":"Year End Admin"`)) {
		t.Fatalf("history: code=%d body=%s", code, body)
	}
}
