//go:build integration

package workflows

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	timetablemodule "github.com/openschool-org/openschool/internal/modules/timetable"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

func TestTimetableWorkflowWithOptionBlocks(t *testing.T) {
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
	exec("INSERT INTO users (id, email, full_name, role) VALUES ($1, 'tt-admin@example.test', 'TT Admin', 'admin')", admin)
	n := 0
	teacher := func(name string) uuid.UUID {
		n++
		user := uuid.New()
		exec("INSERT INTO users (id, email, full_name, role) VALUES ($1, $2, $3, 'teacher')", user, name+"@example.test", name)
		return q("INSERT INTO teacher_profiles (user_id, full_name, employee_number, joined_date, nic_number) VALUES ($1, $2, $2, '2020-01-01', $3) RETURNING id", user, name, "19801234567"+string(rune('0'+n)))
	}
	year := q("INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ('2026', '2026-01-01', '2026-12-31', TRUE) RETURNING id")
	g10 := q("INSERT INTO grades (name, sort_order) VALUES ('Grade 10', 10) RETURNING id")
	classA := q("INSERT INTO classes (grade_id, academic_year_id, name) VALUES ($1, $2, '10-A') RETURNING id", g10, year)
	classB := q("INSERT INTO classes (grade_id, academic_year_id, name) VALUES ($1, $2, '10-B') RETURNING id", g10, year)
	section := q("INSERT INTO grade_sections (academic_year_id, name, interval_start_time, interval_end_time, sort_order) VALUES ($1, 'Senior', '10:30', '10:50', 0) RETURNING id", year)
	exec("INSERT INTO grade_section_grades (grade_section_id, grade_id, academic_year_id) VALUES ($1, $2, $3)", section, g10, year)
	exec("INSERT INTO timetable_periods (grade_section_id, sort_order, period_number, start_time, end_time, slot_type) VALUES ($1, 0, 1, '07:30', '08:10', 'period'), ($1, 1, 2, '08:10', '08:50', 'period')", section)
	maths := q("INSERT INTO subjects (name, code) VALUES ('Mathematics', 'MAT') RETURNING id")
	music := q("INSERT INTO subjects (name, code) VALUES ('Music', 'MUS') RETURNING id")
	art := q("INSERT INTO subjects (name, code) VALUES ('Art', 'ART') RETURNING id")
	exec("INSERT INTO subject_period_requirements (academic_year_id, grade_id, subject_id, periods_per_week) VALUES ($1, $2, $3, 3), ($1, $2, $4, 2), ($1, $2, $5, 2)", year, g10, maths, music, art)
	mathsA, mathsB, musicT, artT := teacher("MathsA"), teacher("MathsB"), teacher("Music"), teacher("Art")
	exec("INSERT INTO class_subject_teachers (class_id, subject_id, teacher_id) VALUES ($1, $3, $4), ($2, $3, $5), ($1, $6, $7), ($2, $6, $7), ($1, $8, $9), ($2, $8, $9)",
		classA, classB, maths, mathsA, mathsB, music, musicT, art, artT)
	level := q("INSERT INTO levels (label, grade_id) VALUES ('O/L', $1) RETURNING id", g10)
	basket := q("INSERT INTO selection_groups (level_id, label, min_select, max_select) VALUES ($1, 'Basket 1', 1, 1) RETURNING id", level)
	exec("INSERT INTO group_subjects (group_id, subject_id) VALUES ($1, $2), ($1, $3)", basket, music, art)
	for i, c := range []uuid.UUID{classA, classB} {
		st := q("INSERT INTO student_profiles (full_name, index_number) VALUES ($1, $1) RETURNING id", "TT-"+string(rune('A'+i)))
		exec("INSERT INTO class_students (class_id, student_id) VALUES ($1, $2)", c, st)
		exec("INSERT INTO student_subject_enrollments (student_id, academic_year_id, group_id, subject_id) VALUES ($1, $2, $3, $4)", st, year, basket, []uuid.UUID{music, art}[i])
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("")
	group.Use(func(c *gin.Context) { c.Set("userID", admin.String()); c.Next() })
	RegisterRoutes(group, NewEngine(NewStore(pool), nil, []Definition{Timetable{}}))

	run := proposeRun(t, router, "timetable", Inputs{})
	blocks := run.Proposal.Section("blocks").Rows
	if len(blocks) != 1 || blocks[0].Cells["classes"] != "10-A, 10-B" || blocks[0].Cells["periods"] != "2" {
		t.Fatalf("blocks: %+v", blocks)
	}
	for _, r := range run.Proposal.Section("classes").Rows {
		if r.Cells["placed"] != "5 of 5" || r.Warning != "" {
			t.Fatalf("dry run for %s: %+v", r.Cells["class"], r)
		}
	}
	if n := scalar[int](t, pool, "SELECT (SELECT COUNT(*) FROM timetables) + (SELECT COUNT(*) FROM timetable_option_blocks)"); n != 0 {
		t.Fatalf("the dry run must not write anything, found %d rows", n)
	}

	if code, body := call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/apply", nil); code != http.StatusOK {
		t.Fatalf("apply: %d %s", code, body)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM timetables WHERE status = 'draft'"); n != 2 {
		t.Fatalf("drafts = %d", n)
	}
	// Both classes hold the block at the same two periods, and maths three times each.
	shared := scalar[int](t, pool, `SELECT COUNT(*) FROM timetable_entries a JOIN timetables ta ON ta.id = a.timetable_id AND ta.class_id = $1
		JOIN timetable_entries b ON b.day_of_week = a.day_of_week AND b.period_number = a.period_number AND b.option_block_id = a.option_block_id
		JOIN timetables tb ON tb.id = b.timetable_id AND tb.class_id = $2 WHERE a.option_block_id IS NOT NULL`, classA, classB)
	if shared != 2 {
		t.Fatalf("shared block periods = %d, want 2", shared)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM timetable_entries WHERE subject_id = $1", maths); n != 6 {
		t.Fatalf("maths lessons = %d", n)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM timetable_entries WHERE subject_id IN ($1, $2)", music, art); n != 0 {
		t.Fatal("music and art should only run inside the block")
	}

	// The timetable validator sees the block's teachers: no clash with the same block in the
	// other class, and music and art hours are met by the block periods.
	exec("UPDATE grade_sections SET section_head_teacher_id = $1 WHERE id = $2", mathsA, section)
	validator := gin.New()
	timetablemodule.RegisterTimetableValidationRoute(validator.Group(""), pool)
	for _, tt := range []uuid.UUID{scalar[uuid.UUID](t, pool, "SELECT id FROM timetables WHERE class_id = $1", classA), scalar[uuid.UUID](t, pool, "SELECT id FROM timetables WHERE class_id = $1", classB)} {
		if code, body := call(t, validator, http.MethodGet, "/timetables/"+tt.String()+"/validate", nil); code != http.StatusOK || !strings.Contains(string(body), `"valid":true`) {
			t.Fatalf("validate %s: %d %s", tt, code, body)
		}
	}
	// A lesson for the music teacher in another class at a block period is a clash.
	blockSlot := scalar[int16](t, pool, "SELECT te.period_number FROM timetable_entries te JOIN timetables tt ON tt.id = te.timetable_id WHERE tt.class_id = $1 AND te.option_block_id IS NOT NULL ORDER BY te.day_of_week, te.period_number LIMIT 1", classA)
	blockDay := scalar[int16](t, pool, "SELECT te.day_of_week FROM timetable_entries te JOIN timetables tt ON tt.id = te.timetable_id WHERE tt.class_id = $1 AND te.option_block_id IS NOT NULL ORDER BY te.day_of_week, te.period_number LIMIT 1", classA)
	class11 := q("INSERT INTO classes (grade_id, academic_year_id, name) VALUES ($1, $2, '10-C') RETURNING id", g10, year)
	tt11 := q("INSERT INTO timetables (academic_year_id, class_id, status, created_by) VALUES ($1, $2, 'draft', $3) RETURNING id", year, class11, admin)
	exec("INSERT INTO timetable_entries (timetable_id, day_of_week, period_number, subject_id, teacher_id) VALUES ($1, $2, $3, $4, $5)", tt11, blockDay, blockSlot, music, musicT)
	if code, body := call(t, validator, http.MethodGet, "/timetables/"+tt11.String()+"/validate", nil); code != http.StatusOK || !strings.Contains(string(body), "Teacher Music is already booked for 10-A") {
		t.Fatalf("expected a clash with the block: %d %s", code, body)
	}
	exec("DELETE FROM classes WHERE id = $1", class11)

	if code, body := call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/revert", nil); code != http.StatusNoContent {
		t.Fatalf("revert: %d %s", code, body)
	}
	if n := scalar[int](t, pool, "SELECT (SELECT COUNT(*) FROM timetables) + (SELECT COUNT(*) FROM timetable_option_blocks)"); n != 0 {
		t.Fatalf("revert left %d rows", n)
	}

	run = proposeRun(t, router, "timetable", Inputs{})
	if code, body := call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/apply", nil); code != http.StatusOK {
		t.Fatalf("re-apply: %d %s", code, body)
	}
	exec("UPDATE timetables SET status = 'published' WHERE class_id = $1", classA)
	if code, _ := call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/revert", nil); code != http.StatusConflict {
		t.Fatalf("revert after publish: %d", code)
	}
	// A new run leaves the published class alone, so its block cannot be rebuilt for 10-B only.
	again := proposeRun(t, router, "timetable", Inputs{"blocks": "false"})
	for _, r := range again.Proposal.Section("classes").Rows {
		if r.ID == classA.String() && r.Cells["placed"] != "-" {
			t.Fatalf("published class should be left alone: %+v", r)
		}
	}
}
