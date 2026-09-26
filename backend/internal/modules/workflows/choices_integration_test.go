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

// Subject choices feed class formation: W3 records basket choices, then W5 groups by them.
func TestSubjectChoicesThenPromotionWithPostgres(t *testing.T) {
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
	admin := uuid.New()
	if _, err := pool.Exec(ctx, "INSERT INTO users (id, email, full_name, role) VALUES ($1, 'choices-admin@example.test', 'Choices Admin', 'admin')", admin); err != nil {
		t.Fatal(err)
	}
	y2026 := q("INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ('2026', '2026-01-01', '2026-12-31', TRUE) RETURNING id")
	y2027 := q("INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ('2027', '2027-01-01', '2027-12-31', FALSE) RETURNING id")
	g9 := q("INSERT INTO grades (name, sort_order) VALUES ('Grade 9', 9) RETURNING id")
	g10 := q("INSERT INTO grades (name, sort_order) VALUES ('Grade 10', 10) RETURNING id")
	class9 := q("INSERT INTO classes (grade_id, academic_year_id, name) VALUES ($1, $2, '9-A') RETURNING id", g9, y2026)
	class10A := q("INSERT INTO classes (grade_id, academic_year_id, name) VALUES ($1, $2, '10-A') RETURNING id", g10, y2027)
	class10B := q("INSERT INTO classes (grade_id, academic_year_id, name) VALUES ($1, $2, '10-B') RETURNING id", g10, y2027)
	level := q("INSERT INTO levels (label, grade_id) VALUES ('O/L', $1) RETURNING id", g10)
	core := q("INSERT INTO selection_groups (level_id, label, min_select, max_select, sort_order) VALUES ($1, 'Core', 1, 1, 0) RETURNING id", level)
	basket := q("INSERT INTO selection_groups (level_id, label, min_select, max_select, sort_order) VALUES ($1, 'Basket 1', 1, 1, 1) RETURNING id", level)
	maths := q("INSERT INTO subjects (name, code) VALUES ('Mathematics', 'MAT') RETURNING id")
	music := q("INSERT INTO subjects (name, code) VALUES ('Music', 'MUS') RETURNING id")
	art := q("INSERT INTO subjects (name, code) VALUES ('Art', 'ART') RETURNING id")
	for _, gs := range [][2]uuid.UUID{{core, maths}, {basket, music}, {basket, art}} {
		if _, err := pool.Exec(ctx, "INSERT INTO group_subjects (group_id, subject_id) VALUES ($1, $2)", gs[0], gs[1]); err != nil {
			t.Fatal(err)
		}
	}
	students := map[string]uuid.UUID{}
	for _, idx := range []string{"CH-1", "CH-2", "CH-3"} {
		students[idx] = q("INSERT INTO student_profiles (full_name, index_number) VALUES ($1, $2) RETURNING id", "Student "+idx, idx)
		if _, err := pool.Exec(ctx, "INSERT INTO class_students (class_id, student_id) VALUES ($1, $2)", class9, students[idx]); err != nil {
			t.Fatal(err)
		}
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("")
	group.Use(func(c *gin.Context) { c.Set("userID", admin.String()); c.Next() })
	RegisterRoutes(group, NewEngine(NewStore(pool), nil, []Definition{SubjectChoices{}, Promotion{}}))

	inputs := Inputs{"source_year": y2026.String(), "target_year": y2027.String(), "level": level.String(), "lock": "true",
		"csv": "index_number,subjects\nCH-1,Music\nCH-2,art\nCH-9,Music\n"}
	run := proposeRun(t, router, "subject_choices", inputs)
	rows := run.Proposal.Section("choices").Rows
	if len(rows) != 3 {
		t.Fatalf("rows = %d", len(rows))
	}
	slot := slotKey(basket, 1)
	byID := map[string]Row{}
	for _, r := range rows {
		byID[r.ID] = r
	}
	if byID[students["CH-1"].String()].Cells[slot] != music.String() || byID[students["CH-2"].String()].Cells[slot] != art.String() || byID[students["CH-3"].String()].Cells[slot] != "" {
		t.Fatalf("CSV not applied: %+v", rows)
	}
	// Maths is compulsory, so it has no column of its own.
	if _, ok := byID[students["CH-1"].String()].Cells[slotKey(core, 1)]; ok {
		t.Fatal("a compulsory group should not get a choice column")
	}
	if code, body := call(t, router, http.MethodPatch, "/workflow-runs/"+run.ID.String()+"/rows", editRequest{Section: "choices", RowID: students["CH-3"].String(), Cells: map[string]string{slot: maths.String()}}); code != http.StatusBadRequest {
		t.Fatalf("a subject from another group must be refused: %d %s", code, body)
	}
	if code, body := call(t, router, http.MethodPatch, "/workflow-runs/"+run.ID.String()+"/rows", editRequest{Section: "choices", RowID: students["CH-3"].String(), Cells: map[string]string{slot: music.String()}}); code != http.StatusOK {
		t.Fatalf("edit: %d %s", code, body)
	}
	if code, body := call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/apply", nil); code != http.StatusOK {
		t.Fatalf("apply: %d %s", code, body)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM student_subject_enrollments WHERE academic_year_id = $1", y2027); n != 6 {
		t.Fatalf("enrolments = %d, want 3 students x (Maths + basket)", n)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM student_enrollment_locks WHERE academic_year_id = $1", y2027); n != 3 {
		t.Fatalf("locks = %d", n)
	}

	// Promotion groups the two Music students together and puts Art in the other class.
	promo := proposeRun(t, router, "promotion", Inputs{"source_year": y2026.String(), "target_year": y2027.String(), "policy:" + g9.String(): PolicyBySubjectChoice})
	placed := map[string]string{}
	for _, r := range promo.Proposal.Section("placements").Rows {
		placed[r.ID] = r.Cells["class"]
	}
	if placed[students["CH-1"].String()] != placed[students["CH-3"].String()] || placed[students["CH-1"].String()] == placed[students["CH-2"].String()] {
		t.Fatalf("placements should follow the basket: %v (10-A %s, 10-B %s)", placed, class10A, class10B)
	}

	// Revert clears the choices and the locks again.
	if code, body := call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/revert", nil); code != http.StatusNoContent {
		t.Fatalf("revert: %d %s", code, body)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM student_subject_enrollments") + scalar[int](t, pool, "SELECT COUNT(*) FROM student_enrollment_locks"); n != 0 {
		t.Fatalf("revert left %d rows", n)
	}
}
