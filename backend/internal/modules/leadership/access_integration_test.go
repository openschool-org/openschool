//go:build integration

package leadership

import (
	"context"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	auditmodule "github.com/openschool-org/openschool/internal/modules/audit"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

// Covers every kind of teacher: class, subject (several subjects), section head, scoped VP, principal, and none.
func TestCanAccessClassByRoleWithPostgres(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := testdb.Open(t)
	ctx := context.Background()
	f := seedLeadershipFixture(t, pool)
	service := NewService(NewRepository(pool), auditmodule.NewService(auditmodule.NewRepository(pool)))
	router := leadershipRouter(service, f.adminID)

	var classA, classB, studentA uuid.UUID
	mustScan(t, pool, &classA, "SELECT id FROM classes WHERE grade_id = $1", f.firstGradeID)
	mustScan(t, pool, &studentA, "SELECT student_id FROM class_students WHERE class_id = $1", classA)
	mustScan(t, pool, &classB, "INSERT INTO classes (grade_id, academic_year_id, name) VALUES ($1, $2, 'B') RETURNING id", f.secondGradeID, f.academicYearID)

	classTeacher := seedLeadershipTeacher(t, pool, "Class Teacher", "ACC-CLASS", "199100000001")
	subjectTeacher := seedLeadershipTeacher(t, pool, "Subject Teacher", "ACC-SUBJECT", "199100000002")
	outsider := seedLeadershipTeacher(t, pool, "Other Teacher", "ACC-OTHER", "199100000003")
	mustExec(t, pool, "UPDATE classes SET form_teacher_id = $1 WHERE id = $2", classTeacher, classA)
	for _, code := range []string{"ACC-MATHS", "ACC-SCIENCE"} {
		var subjectID uuid.UUID
		mustScan(t, pool, &subjectID, "INSERT INTO subjects (name, code) VALUES ($1, $1) RETURNING id", code)
		mustExec(t, pool, "INSERT INTO class_subject_teachers (class_id, subject_id, teacher_id) VALUES ($1, $2, $3)", classB, subjectID, subjectTeacher)
	}

	// Section head of grade 8, vice principal scoped to grade 7, and a principal.
	for path, body := range map[string]any{
		"/section-heads":            AssignSectionHeadRequest{AcademicYearID: f.academicYearID.String(), GradeID: f.secondGradeID.String(), TeacherID: f.sectionHeadTeacherID.String()},
		"/positions/vice-principal": AssignVicePrincipalRequest{TeacherID: f.vicePrincipalTeacherID.String(), GradeIDs: []string{f.firstGradeID.String()}},
		"/positions/principal":      AssignPrincipalRequest{TeacherID: f.principalTeacherID.String()},
	} {
		if res := performLeadershipRequest(t, router, http.MethodPut, path, body); res.Code != http.StatusOK {
			t.Fatalf("PUT %s: code=%d body=%s", path, res.Code, res.Body.String())
		}
	}

	cases := []struct {
		name         string
		teacher      uuid.UUID
		wantA, wantB bool
	}{
		{"class teacher", classTeacher, true, false},
		{"subject teacher", subjectTeacher, false, true},
		{"section head of grade 8", f.sectionHeadTeacherID, false, true},
		{"vice principal for grade 7", f.vicePrincipalTeacherID, true, false},
		{"principal", f.principalTeacherID, true, true},
		{"unrelated teacher", outsider, false, false},
	}
	for _, tc := range cases {
		var userID uuid.UUID
		mustScan(t, pool, &userID, "SELECT user_id FROM teacher_profiles WHERE id = $1", tc.teacher)
		for class, want := range map[uuid.UUID]bool{classA: tc.wantA, classB: tc.wantB} {
			got, err := service.CanAccessClass(ctx, userID, class)
			if err != nil || got != want {
				t.Errorf("%s on class %s: got %t err %v, want %t", tc.name, class, got, err, want)
			}
		}
		// The student is in class A, so student access follows class A.
		if got, err := service.CanAccessStudent(ctx, userID, studentA); err != nil || got != tc.wantA {
			t.Errorf("%s on student: got %t err %v, want %t", tc.name, got, err, tc.wantA)
		}
	}
}

func mustScan(t *testing.T, pool *pgxpool.Pool, dest *uuid.UUID, sql string, args ...any) {
	t.Helper()
	if err := pool.QueryRow(context.Background(), sql, args...).Scan(dest); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
}

func mustExec(t *testing.T, pool *pgxpool.Pool, sql string, args ...any) {
	t.Helper()
	if _, err := pool.Exec(context.Background(), sql, args...); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
}
