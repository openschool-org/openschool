//go:build integration

package workflows

import (
	"bytes"
	"context"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

type promotionFixture struct {
	admin, year2026, year2027, grade6, grade7, class7A uuid.UUID
	students                                           [2]uuid.UUID
	admitted                                           uuid.UUID
}

// seedPromotion: 6-A holds two students, 7-A next year has room for two, and one new
// admission waits for grade 7, so the proposal must add a 7-B for them.
func seedPromotion(t *testing.T, pool *pgxpool.Pool) promotionFixture {
	t.Helper()
	ctx := context.Background()
	var f promotionFixture
	must := func(err error) {
		t.Helper()
		if err != nil {
			t.Fatal(err)
		}
	}
	f.admin = uuid.New()
	_, err := pool.Exec(ctx, "INSERT INTO users (id, email, full_name, role) VALUES ($1, 'promo-admin@example.test', 'Promo Admin', 'admin')", f.admin)
	must(err)
	must(pool.QueryRow(ctx, "INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ('2026', '2026-01-01', '2026-12-31', TRUE) RETURNING id").Scan(&f.year2026))
	must(pool.QueryRow(ctx, "INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ('2027', '2027-01-01', '2027-12-31', FALSE) RETURNING id").Scan(&f.year2027))
	must(pool.QueryRow(ctx, "INSERT INTO grades (name, sort_order) VALUES ('Grade 6', 6) RETURNING id").Scan(&f.grade6))
	must(pool.QueryRow(ctx, "INSERT INTO grades (name, sort_order) VALUES ('Grade 7', 7) RETURNING id").Scan(&f.grade7))
	var class6A uuid.UUID
	must(pool.QueryRow(ctx, "INSERT INTO classes (grade_id, academic_year_id, name) VALUES ($1, $2, '6-A') RETURNING id", f.grade6, f.year2026).Scan(&class6A))
	must(pool.QueryRow(ctx, "INSERT INTO classes (grade_id, academic_year_id, name, capacity) VALUES ($1, $2, '7-A', 2) RETURNING id", f.grade7, f.year2027).Scan(&f.class7A))
	for i, name := range []string{"Amal Fernando", "Bimal Jayasuriya"} {
		must(pool.QueryRow(ctx, "INSERT INTO student_profiles (full_name, index_number) VALUES ($1, $2) RETURNING id", name, "PR-"+name[:1]).Scan(&f.students[i]))
		_, err = pool.Exec(ctx, "INSERT INTO class_students (class_id, student_id) VALUES ($1, $2)", class6A, f.students[i])
		must(err)
	}
	must(pool.QueryRow(ctx, "INSERT INTO student_profiles (full_name, index_number) VALUES ('Chamari Dias', 'PR-C') RETURNING id").Scan(&f.admitted))
	_, err = pool.Exec(ctx, "INSERT INTO student_intakes (student_id, academic_year_id, grade_id) VALUES ($1, $2, $3)", f.admitted, f.year2027, f.grade7)
	must(err)
	return f
}

func promotionRouter(pool *pgxpool.Pool, actor uuid.UUID) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("")
	group.Use(func(c *gin.Context) {
		c.Set("userID", actor.String())
		c.Next()
	})
	RegisterRoutes(group, NewEngine(NewStore(pool), nil, []Definition{Promotion{}}))
	return router
}

func TestPromotionWorkflowWithPostgres(t *testing.T) {
	pool := testdb.Open(t)
	f := seedPromotion(t, pool)
	router := promotionRouter(pool, f.admin)
	inputs := Inputs{"source_year": f.year2026.String(), "target_year": f.year2027.String()}

	// Grade 6 moves up keeping its section; grade 7 is the last grade, so it leaves by default.
	code, body := call(t, router, http.MethodPost, "/workflows/promotion/check", map[string]any{"inputs": inputs})
	if code != http.StatusOK || !bytes.Contains(body, []byte(`"key":"target_classes","title":"Next year has classes","ok":true`)) {
		t.Fatalf("check: code=%d body=%s", code, body)
	}

	run := proposeRun(t, router, "promotion", inputs)
	placements := run.Proposal.Section("placements").Rows
	if len(placements) != 3 {
		t.Fatalf("placement rows = %d, want 3: %+v", len(placements), placements)
	}
	newClasses := run.Proposal.Section("new_classes").Rows
	if len(newClasses) != 1 || newClasses[0].Cells["class"] != "7-B" {
		t.Fatalf("expected one new section 7-B, got %+v", newClasses)
	}
	for _, r := range placements {
		want := f.class7A.String()
		if r.ID == f.admitted.String() {
			want = newClasses[0].ID
		}
		if r.Cells["class"] != want {
			t.Fatalf("%s placed in %q, want %q (%s)", r.Cells["name"], r.Cells["class"], want, r.Reason)
		}
	}

	// Only classes of the target grade are valid choices.
	if code, body = call(t, router, http.MethodPatch, "/workflow-runs/"+run.ID.String()+"/rows", editRequest{Section: "placements", RowID: f.admitted.String(), Cells: map[string]string{"class": uuid.NewString()}}); code != http.StatusBadRequest {
		t.Fatalf("foreign class edit: code=%d body=%s", code, body)
	}

	if code, body = call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/apply", nil); code != http.StatusOK {
		t.Fatalf("apply: code=%d body=%s", code, body)
	}
	class7B := scalar[uuid.UUID](t, pool, "SELECT id FROM classes WHERE academic_year_id = $1 AND name = '7-B'", f.year2027)
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM classes WHERE id = $1 AND home_classroom_id IS NOT NULL", class7B); n != 1 {
		t.Fatal("new section should get a homeroom")
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM class_students WHERE class_id = $1", f.class7A); n != 2 {
		t.Fatalf("7-A holds %d students, want 2", n)
	}
	if got := scalar[uuid.UUID](t, pool, "SELECT class_id FROM class_students WHERE student_id = $1", f.admitted); got != class7B {
		t.Fatal("the new admission should be in 7-B")
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM student_intakes"); n != 0 {
		t.Fatal("placed admissions should leave the intake list")
	}
	if p := scalar[string](t, pool, "SELECT policy FROM promotion_policies WHERE from_grade_id = $1", f.grade6); p != PolicyKeepSection {
		t.Fatalf("saved rule = %s", p)
	}
	// Last year's classes are untouched.
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM class_students cs JOIN classes c ON c.id = cs.class_id WHERE c.academic_year_id = $1", f.year2026); n != 2 {
		t.Fatalf("2026 class lists changed: %d", n)
	}

	// Revert puts everything back: no 2027 places, no 7-B, the admission waiting again.
	if code, body = call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/revert", nil); code != http.StatusNoContent {
		t.Fatalf("revert: code=%d body=%s", code, body)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM class_students cs JOIN classes c ON c.id = cs.class_id WHERE c.academic_year_id = $1", f.year2027); n != 0 {
		t.Fatalf("revert left %d placements", n)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM classes WHERE id = $1", class7B); n != 0 {
		t.Fatal("revert should drop the section it created")
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM student_intakes WHERE student_id = $1", f.admitted); n != 1 {
		t.Fatal("revert should restore the admission")
	}

	// Once attendance is taken in the new classes, revert is refused.
	run = proposeRun(t, router, "promotion", inputs)
	if code, body = call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/apply", nil); code != http.StatusOK {
		t.Fatalf("re-apply: code=%d body=%s", code, body)
	}
	if _, err := pool.Exec(context.Background(), "INSERT INTO attendance_sessions (class_id, taken_by, date) VALUES ($1, $2, '2027-01-05')", f.class7A, f.admin); err != nil {
		t.Fatal(err)
	}
	if code, body = call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/revert", nil); code != http.StatusConflict {
		t.Fatalf("revert after attendance: code=%d body=%s", code, body)
	}
}
