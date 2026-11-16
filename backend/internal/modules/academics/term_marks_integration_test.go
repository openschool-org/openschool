//go:build integration

package academics

import (
	"bytes"
	"context"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

type termMarkFixture struct {
	adminUserID, teacherUserID, otherTeacherUserID uuid.UUID
	teacherID, classID, studentID, outsiderID      uuid.UUID
	termID, subjectID                              uuid.UUID
}

func TestTermMarkWorkflowAPIWithPostgres(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := testdb.Open(t)
	fixture := seedTermMarkFixture(t, pool)
	runner := NewTermMarkService(NewTermMarkRepository(pool))
	teacherRouter := termMarkRouter(runner, fixture.teacherUserID, authz.RoleTeacher)
	otherTeacherRouter := termMarkRouter(runner, fixture.otherTeacherUserID, authz.RoleTeacher)
	adminRouter := termMarkRouter(runner, fixture.adminUserID, authz.RoleAdmin)
	marksPath := "/classes/" + fixture.classID.String() + "/marks"

	request := BulkUpsertMarksRequest{
		TermID: fixture.termID.String(), SubjectID: fixture.subjectID.String(),
		Entries: []MarkEntry{{StudentID: fixture.studentID.String(), Marks: 82, MaxMarks: 100}},
	}
	created := performAcademicRequest(t, teacherRouter, http.MethodPut, marksPath, request)
	if created.Code != http.StatusOK {
		t.Fatalf("create term mark: code=%d body=%s", created.Code, created.Body.String())
	}
	markID := assertTermMark(t, pool, fixture, "82.00", "100.00", false, fixture.teacherUserID, 1)

	request.Entries[0] = MarkEntry{StudentID: fixture.studentID.String(), Marks: 91, IsAbsent: true}
	updated := performAcademicRequest(t, teacherRouter, http.MethodPut, marksPath, request)
	if updated.Code != http.StatusOK {
		t.Fatalf("update absent term mark: code=%d body=%s", updated.Code, updated.Body.String())
	}
	updatedID := assertTermMark(t, pool, fixture, "0.00", "100.00", true, fixture.teacherUserID, 1)
	if updatedID != markID {
		t.Fatalf("upsert created a new mark: first=%s updated=%s", markID, updatedID)
	}

	classListPath := marksPath + "?term_id=" + fixture.termID.String() + "&subject_id=" + fixture.subjectID.String()
	classMarks := performAcademicRequest(t, teacherRouter, http.MethodGet, classListPath, nil)
	if classMarks.Code != http.StatusOK || !bytes.Contains(classMarks.Body.Bytes(), []byte(fixture.studentID.String())) || !bytes.Contains(classMarks.Body.Bytes(), []byte(`"is_absent":true`)) {
		t.Fatalf("list class marks: code=%d body=%s", classMarks.Code, classMarks.Body.String())
	}
	studentMarks := performAcademicRequest(t, teacherRouter, http.MethodGet, "/students/"+fixture.studentID.String()+"/marks?term_id="+fixture.termID.String(), nil)
	if studentMarks.Code != http.StatusOK || !bytes.Contains(studentMarks.Body.Bytes(), []byte(`"subject_name":"Mathematics"`)) {
		t.Fatalf("list student marks: code=%d body=%s", studentMarks.Code, studentMarks.Body.String())
	}

	request.Entries[0] = MarkEntry{StudentID: fixture.outsiderID.String(), Marks: 70, MaxMarks: 100}
	notEnrolled := performAcademicRequest(t, teacherRouter, http.MethodPut, marksPath, request)
	if notEnrolled.Code != http.StatusBadRequest {
		t.Fatalf("non-enrolled student mark: code=%d body=%s", notEnrolled.Code, notEnrolled.Body.String())
	}
	assertNoTermMark(t, pool, fixture.outsiderID, fixture.subjectID, fixture.termID)

	request.Entries[0] = MarkEntry{StudentID: fixture.studentID.String(), Marks: 75, MaxMarks: 100}
	forbidden := performAcademicRequest(t, otherTeacherRouter, http.MethodPut, marksPath, request)
	if forbidden.Code != http.StatusForbidden {
		t.Fatalf("unassigned teacher mark: code=%d body=%s", forbidden.Code, forbidden.Body.String())
	}
	assertTermMark(t, pool, fixture, "0.00", "100.00", true, fixture.teacherUserID, 1)

	deleted := performAcademicRequest(t, adminRouter, http.MethodDelete, "/marks/"+markID.String(), nil)
	if deleted.Code != http.StatusOK {
		t.Fatalf("delete term mark: code=%d body=%s", deleted.Code, deleted.Body.String())
	}
	assertNoTermMark(t, pool, fixture.studentID, fixture.subjectID, fixture.termID)
}

func termMarkRouter(runner TermMarkRunner, userID uuid.UUID, role string) *gin.Engine {
	router := gin.New()
	group := router.Group("")
	group.Use(func(c *gin.Context) {
		c.Set("userID", userID.String())
		c.Set("roles", []string{role})
		c.Next()
	})
	RegisterTermMarkRoutes(group, runner)
	return router
}

func seedTermMarkFixture(t *testing.T, pool *pgxpool.Pool) termMarkFixture {
	t.Helper()
	ctx := context.Background()
	f := termMarkFixture{adminUserID: uuid.New(), teacherUserID: uuid.New(), otherTeacherUserID: uuid.New()}
	users := []struct {
		id                uuid.UUID
		email, name, role string
	}{
		{f.adminUserID, "marks-admin@example.test", "Marks Admin", authz.RoleAdmin},
		{f.teacherUserID, "marks-teacher@example.test", "Marks Teacher", authz.RoleTeacher},
		{f.otherTeacherUserID, "other-marks-teacher@example.test", "Other Marks Teacher", authz.RoleTeacher},
	}
	for _, user := range users {
		if _, err := pool.Exec(ctx, "INSERT INTO users (id, email, full_name, role) VALUES ($1, $2, $3, $4)", user.id, user.email, user.name, user.role); err != nil {
			t.Fatal(err)
		}
	}
	if err := pool.QueryRow(ctx, "INSERT INTO teacher_profiles (user_id, full_name, employee_number, joined_date, nic_number) VALUES ($1, 'Marks Teacher', 'MARK-T-001', '2020-01-01', 'MARK-NIC-T-001') RETURNING id", f.teacherUserID).Scan(&f.teacherID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, "INSERT INTO teacher_profiles (user_id, full_name, employee_number, joined_date, nic_number) VALUES ($1, 'Other Marks Teacher', 'MARK-T-002', '2020-01-01', 'MARK-NIC-T-002')", f.otherTeacherUserID); err != nil {
		t.Fatal(err)
	}
	var yearID, gradeID uuid.UUID
	if err := pool.QueryRow(ctx, "INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ('2026 Marks', '2026-01-01', '2026-12-31', TRUE) RETURNING id").Scan(&yearID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO grades (name, sort_order) VALUES ('Grade 10 Marks', 10) RETURNING id").Scan(&gradeID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO classes (grade_id, academic_year_id, form_teacher_id, name) VALUES ($1, $2, $3, 'A') RETURNING id", gradeID, yearID, f.teacherID).Scan(&f.classID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO terms (academic_year_id, name, start_date, end_date, is_current, sort_order) VALUES ($1, 'Term 1', '2026-01-01', '2026-04-30', TRUE, 1) RETURNING id", yearID).Scan(&f.termID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO subjects (name, code) VALUES ('Mathematics', 'MARK-MATH') RETURNING id").Scan(&f.subjectID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, "INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2)", f.teacherID, f.subjectID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, "INSERT INTO class_subject_teachers (class_id, subject_id, teacher_id) VALUES ($1, $2, $3)", f.classID, f.subjectID, f.teacherID); err != nil {
		t.Fatal(err)
	}
	f.studentID = seedTermMarkStudent(t, pool, "Marks Student", "MARK-S-001", f.classID)
	f.outsiderID = seedTermMarkStudent(t, pool, "Outside Student", "MARK-S-002", uuid.Nil)
	return f
}

func seedTermMarkStudent(t *testing.T, pool *pgxpool.Pool, name, index string, classID uuid.UUID) uuid.UUID {
	t.Helper()
	ctx := context.Background()
	var studentID uuid.UUID
	if err := pool.QueryRow(ctx, "INSERT INTO student_profiles (full_name, index_number) VALUES ($1, $2) RETURNING id", name, index).Scan(&studentID); err != nil {
		t.Fatal(err)
	}
	if classID != uuid.Nil {
		if _, err := pool.Exec(ctx, "INSERT INTO class_students (class_id, student_id) VALUES ($1, $2)", classID, studentID); err != nil {
			t.Fatal(err)
		}
	}
	return studentID
}

func assertTermMark(t *testing.T, pool *pgxpool.Pool, f termMarkFixture, marks, maxMarks string, absent bool, enteredBy uuid.UUID, wantCount int) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	var count int
	var gotMarks, gotMaxMarks string
	var gotAbsent bool
	var gotEnteredBy uuid.UUID
	if err := pool.QueryRow(context.Background(), `
		SELECT id, COUNT(*) OVER (), marks::text, max_marks::text, is_absent, entered_by
		FROM term_marks WHERE student_id = $1 AND subject_id = $2 AND term_id = $3`, f.studentID, f.subjectID, f.termID).Scan(&id, &count, &gotMarks, &gotMaxMarks, &gotAbsent, &gotEnteredBy); err != nil {
		t.Fatal(err)
	}
	if count != wantCount || gotMarks != marks || gotMaxMarks != maxMarks || gotAbsent != absent || gotEnteredBy != enteredBy {
		t.Fatalf("term mark id=%s count=%d marks=%s/%s absent=%v entered_by=%s", id, count, gotMarks, gotMaxMarks, gotAbsent, gotEnteredBy)
	}
	return id
}

func assertNoTermMark(t *testing.T, pool *pgxpool.Pool, studentID, subjectID, termID uuid.UUID) {
	t.Helper()
	var count int
	if err := pool.QueryRow(context.Background(), "SELECT COUNT(*) FROM term_marks WHERE student_id = $1 AND subject_id = $2 AND term_id = $3", studentID, subjectID, termID).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("found %d unexpected term marks", count)
	}
}
