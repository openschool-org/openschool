//go:build integration

package workflows

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

func TestStudentImportPlacesStudentsInCurrentClasses(t *testing.T) {
	pool := testdb.Open(t)
	ctx := context.Background()
	admin := uuid.New()
	var year, grade, classA, classB uuid.UUID
	for _, stmt := range []struct {
		sql  string
		dest *uuid.UUID
		args []any
	}{
		{"INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ('2026', '2026-01-01', '2026-12-31', TRUE) RETURNING id", &year, nil},
		{"INSERT INTO grades (name, sort_order) VALUES ('Grade 6', 6) RETURNING id", &grade, nil},
	} {
		if err := pool.QueryRow(ctx, stmt.sql, stmt.args...).Scan(stmt.dest); err != nil {
			t.Fatal(err)
		}
	}
	if err := pool.QueryRow(ctx, "INSERT INTO classes (grade_id, academic_year_id, name, capacity) VALUES ($1, $2, '6-A', 2) RETURNING id", grade, year).Scan(&classA); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO classes (grade_id, academic_year_id, name) VALUES ($1, $2, '6-B') RETURNING id", grade, year).Scan(&classB); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, "INSERT INTO users (id, email, full_name, role) VALUES ($1, 'import-admin@example.test', 'Import Admin', 'admin')", admin); err != nil {
		t.Fatal(err)
	}
	// A guardian already on record with a parent login, stored with a lower-case NIC letter.
	parentUser := uuid.New()
	var loggedInGuardian uuid.UUID
	if _, err := pool.Exec(ctx, "INSERT INTO users (id, email, full_name, role) VALUES ($1, 'kumari@example.test', 'Kumari Silva', 'parent')", parentUser); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO guardians (full_name, relationship, phone, email, nic_number, user_id) VALUES ('Kumari Silva', 'mother', '+94771111111', 'kumari@example.test', '801234567v', $1) RETURNING id", parentUser).Scan(&loggedInGuardian); err != nil {
		t.Fatal(err)
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("")
	group.Use(func(c *gin.Context) { c.Set("userID", admin.String()); c.Next() })
	RegisterRoutes(group, NewEngine(NewStore(pool), nil, []Definition{StudentImport{}}))

	csvText := strings.Join([]string{
		"Class,Index Number,Full Name,Gender,Phone,Guardian Name,Guardian Relationship,Guardian Phone,Guardian NIC",
		"6-A,IM-1,Nimali Perera,female,0771234567,Sunil Perera,father,0712345678,197512345678",
		"grade 6 a,IM-2,Kasun Perera,male,,Sunil Perera,father,0712345678,197512345678",
		"6B,IM-3,Tharushi Silva,female,,,,,",
		"7-Z,IM-4,Unknown Class,male,,,,,",
		"6-A,IM-5,Bad Phone,male,12345,,,,",
		"6-B,IM-6,Sithum Silva,male,,Kumari Silva,mother,0771111111,801234567V",
		"6-B,IM-7,Wrong Parent,male,,Nimal Silva,father,0771234000,801234567V",
		"6-B,IM-8,Other Name,female,,Kamal Perera,father,0712345678,197512345678",
		"6-B,IM-9,New Nic Same Mum,female,,Kumari Silva,mother,0771111111,199912345678",
	}, "\n")
	run := proposeRun(t, router, "student_import", Inputs{"csv": csvText})
	byIndex := map[string]Row{}
	for _, r := range run.Proposal.Section("students").Rows {
		byIndex[r.Cells["index"]] = r
	}
	for index, want := range map[string]string{"IM-1": "true", "IM-2": "true", "IM-3": "true", "IM-4": "false", "IM-5": "false",
		"IM-6": "true", "IM-7": "false", "IM-8": "false", "IM-9": "true"} {
		if got := byIndex[index].Cells["import"]; got != want {
			t.Fatalf("%s import = %s (%s / %s)", index, got, byIndex[index].Reason, byIndex[index].Warning)
		}
	}
	if byIndex["IM-2"].Cells["class"] != classA.String() || byIndex["IM-3"].Cells["class"] != classB.String() {
		t.Fatal("class names should match regardless of spelling")
	}
	if !strings.Contains(byIndex["IM-6"].Reason, "not added again") || !strings.Contains(byIndex["IM-6"].Reason, "parent portal") {
		t.Fatalf("existing guardian with a login: %q", byIndex["IM-6"].Reason)
	}
	if !strings.Contains(byIndex["IM-7"].Warning, "belongs to Kumari Silva on record") {
		t.Fatalf("NIC clash with the record: %q", byIndex["IM-7"].Warning)
	}
	if !strings.Contains(byIndex["IM-8"].Warning, "is Sunil Perera on line 2 but Kamal Perera here") {
		t.Fatalf("NIC clash inside the file: %q", byIndex["IM-8"].Warning)
	}
	if !strings.Contains(byIndex["IM-9"].Reason, "already on record with 801234567V") {
		t.Fatalf("same mother under a new NIC: %q", byIndex["IM-9"].Reason)
	}
	if byIndex["IM-4"].Warning != "" || !strings.Contains(byIndex["IM-4"].Reason, "choose a class") {
		t.Fatalf("an unknown class should ask for a choice, not block: %q / %q", byIndex["IM-4"].Reason, byIndex["IM-4"].Warning)
	}

	// Ticking a row without a class is refused; choosing a class in the preview fixes it.
	edit := func(row Row, cells map[string]string) {
		t.Helper()
		if code, body := call(t, router, http.MethodPatch, "/workflow-runs/"+run.ID.String()+"/rows", editRequest{Section: "students", RowID: row.ID, Cells: cells}); code != http.StatusOK {
			t.Fatalf("edit: %d %s", code, body)
		}
	}
	edit(byIndex["IM-4"], map[string]string{"import": "true"})
	if code, body := call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/apply", nil); code != http.StatusBadRequest || !strings.Contains(string(body), "choose a class") {
		t.Fatalf("apply without class: %d %s", code, body)
	}
	edit(byIndex["IM-4"], map[string]string{"class": classB.String()})
	if code, body := call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/apply", nil); code != http.StatusOK {
		t.Fatalf("apply: %d %s", code, body)
	}

	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM class_students WHERE class_id = $1", classA); n != 2 {
		t.Fatalf("6-A students = %d", n)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM class_students WHERE class_id = $1", classB); n != 4 {
		t.Fatalf("6-B students = %d", n)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM student_intakes"); n != 0 {
		t.Fatal("the import must not use the intake waiting list")
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM guardians"); n != 3 {
		t.Fatalf("guardians = %d, want the logged-in one plus Sunil (shared by siblings) plus the new-NIC row", n)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM student_guardians WHERE guardian_id = $1", loggedInGuardian); n != 1 {
		t.Fatal("the student should be linked to the guardian who already has a login")
	}

	// Its own class places don't block undo; everything it added is removed.
	if code, body := call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/revert", nil); code != http.StatusNoContent {
		t.Fatalf("revert: %d %s", code, body)
	}
	for _, q := range []string{"SELECT COUNT(*) FROM student_profiles", "SELECT COUNT(*) FROM class_students"} {
		if n := scalar[int](t, pool, q); n != 0 {
			t.Fatalf("%s after revert = %d", q, n)
		}
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM guardians WHERE id = $1 AND user_id IS NOT NULL", loggedInGuardian); n != 1 {
		t.Fatal("undo must never remove a guardian who was already on record")
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM guardians"); n != 1 {
		t.Fatalf("guardians after revert = %d, only the one on record should remain", n)
	}
}
