//go:build integration

package workflows

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/idp"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

type fakeProvider struct{ created []string }

func (f *fakeProvider) CreateUser(_ context.Context, _ string, attrs map[string]any) (*idp.User, error) {
	f.created = append(f.created, attrs["username"].(string))
	return &idp.User{ID: uuid.NewString()}, nil
}
func (*fakeProvider) UpdateUser(context.Context, string, string, map[string]any) error { return nil }
func (*fakeProvider) DeleteUser(context.Context, string) error                         { return nil }
func (*fakeProvider) AssignRole(context.Context, string, string) error                 { return nil }
func (*fakeProvider) ListUsers(context.Context) ([]idp.User, error)                    { return nil, nil }

func TestIntakeWorkflowWithPostgres(t *testing.T) {
	pool := testdb.Open(t)
	ctx := context.Background()
	admin := uuid.New()
	var year, grade, medium, existingGuardian uuid.UUID
	for _, stmt := range []struct {
		sql  string
		dest *uuid.UUID
	}{
		{"INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ('2027', '2027-01-01', '2027-12-31', FALSE) RETURNING id", &year},
		{"INSERT INTO grades (name, sort_order) VALUES ('Grade 6', 6) RETURNING id", &grade},
		{"INSERT INTO mediums (name) VALUES ('Sinhala') RETURNING id", &medium},
		{"INSERT INTO guardians (full_name, relationship, phone, nic_number) VALUES ('Kumari Silva', 'mother', '0771111111', '198012345678') RETURNING id", &existingGuardian},
	} {
		if err := pool.QueryRow(ctx, stmt.sql).Scan(stmt.dest); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := pool.Exec(ctx, "INSERT INTO users (id, email, full_name, role) VALUES ($1, 'intake-admin@example.test', 'Intake Admin', 'admin')", admin); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, "INSERT INTO student_profiles (full_name, index_number) VALUES ('Already Here', 'IN-0')"); err != nil {
		t.Fatal(err)
	}

	provider := &fakeProvider{}
	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("")
	group.Use(func(c *gin.Context) { c.Set("userID", admin.String()); c.Next() })
	RegisterRoutes(group, NewEngine(NewStore(pool), nil, []Definition{NewStudentIntake(provider)}))

	csvText := strings.Join([]string{
		"Index Number,Full Name,Gender,Medium,Phone,Email,Guardian Name,Guardian Relationship,Guardian Phone,Guardian NIC",
		"IN-1,Nimali Perera,female,sinhala,0771234567,nimali@example.test,Sunil Perera,father,0712345678,197512345678",
		"IN-2,Kasun Perera,male,,,,Sunil Perera,father,0712345678,197512345678",
		"IN-3,Tharushi Silva,female,Sinhala,,,Kumari Silva,mother,0771111111,198012345678",
		"IN-0,Duplicate Index,male,,,,,,,",
		"IN-4,Bad Phone,male,,12345,,,,,",
		"IN-5,Unknown Medium,male,Klingon,,,,,,",
	}, "\n")
	inputs := Inputs{"target_year": year.String(), "grade": grade.String(), "csv": csvText, "create_accounts": "true"}
	run := proposeRun(t, router, "intake", inputs)
	rows := run.Proposal.Section("students").Rows
	if len(rows) != 6 {
		t.Fatalf("rows = %d", len(rows))
	}
	byIndex := map[string]Row{}
	for _, r := range rows {
		byIndex[r.Cells["index"]] = r
	}
	for index, wantImport := range map[string]string{"IN-1": "true", "IN-2": "true", "IN-3": "true", "IN-0": "false", "IN-4": "false", "IN-5": "false"} {
		if got := byIndex[index].Cells["import"]; got != wantImport {
			t.Fatalf("%s import = %s (%s)", index, got, byIndex[index].Warning)
		}
	}
	if !strings.Contains(byIndex["IN-2"].Reason, "Sibling of Nimali Perera") || !strings.Contains(byIndex["IN-3"].Reason, "already on record") {
		t.Fatalf("reasons: %q / %q", byIndex["IN-2"].Reason, byIndex["IN-3"].Reason)
	}
	if byIndex["IN-1"].Cells["medium"] != medium.String() {
		t.Fatal("medium name should match case-insensitively")
	}

	// Ticking a row with a problem is refused at apply.
	if code, body := call(t, router, http.MethodPatch, "/workflow-runs/"+run.ID.String()+"/rows", editRequest{Section: "students", RowID: byIndex["IN-4"].ID, Cells: map[string]string{"import": "true"}}); code != http.StatusOK {
		t.Fatalf("edit: %d %s", code, body)
	}
	if code, body := call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/apply", nil); code != http.StatusBadRequest || !strings.Contains(string(body), "line 6") {
		t.Fatalf("apply with bad row: %d %s", code, body)
	}
	if code, body := call(t, router, http.MethodPatch, "/workflow-runs/"+run.ID.String()+"/rows", editRequest{Section: "students", RowID: byIndex["IN-4"].ID, Cells: map[string]string{"import": "false"}}); code != http.StatusOK {
		t.Fatalf("edit back: %d %s", code, body)
	}
	if code, body := call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/apply", nil); code != http.StatusOK {
		t.Fatalf("apply: %d %s", code, body)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM student_intakes WHERE academic_year_id = $1 AND grade_id = $2", year, grade); n != 3 {
		t.Fatalf("intakes = %d", n)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM guardians"); n != 2 {
		t.Fatalf("guardians = %d, want the existing one plus one shared by the siblings", n)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM student_guardians WHERE guardian_id = $1", existingGuardian); n != 1 {
		t.Fatal("IN-3 should be linked to the guardian already on record")
	}
	if len(provider.created) != 1 || provider.created[0] != "IN-1" {
		t.Fatalf("accounts created for %v, want only IN-1 (the one with an email)", provider.created)
	}

	// An account now exists, so revert is refused; without it, revert removes everything it added.
	if code, _ := call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/revert", nil); code != http.StatusConflict {
		t.Fatalf("revert with account: %d", code)
	}
	if _, err := pool.Exec(ctx, "UPDATE student_profiles SET user_id = NULL"); err != nil {
		t.Fatal(err)
	}
	if code, body := call(t, router, http.MethodPost, "/workflow-runs/"+run.ID.String()+"/revert", nil); code != http.StatusNoContent {
		t.Fatalf("revert: %d %s", code, body)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM student_profiles"); n != 1 {
		t.Fatalf("students after revert = %d", n)
	}
	if n := scalar[int](t, pool, "SELECT COUNT(*) FROM guardians"); n != 1 {
		t.Fatalf("guardians after revert = %d, the existing guardian must stay", n)
	}
}
