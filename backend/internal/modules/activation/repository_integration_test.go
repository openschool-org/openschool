//go:build integration

package activation

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

type seeded struct {
	classID, studentID, otherStudentID, guardianID uuid.UUID
}

func seed(t *testing.T, pool *pgxpool.Pool) seeded {
	t.Helper()
	ctx := context.Background()
	var s seeded
	var yearID, gradeID uuid.UUID
	mustScan := func(sql string, dest *uuid.UUID, args ...any) {
		t.Helper()
		if err := pool.QueryRow(ctx, sql, args...).Scan(dest); err != nil {
			t.Fatalf("%s: %v", sql, err)
		}
	}
	mustScan("INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ('2026', '2026-01-01', '2026-12-31', TRUE) RETURNING id", &yearID)
	mustScan("INSERT INTO grades (name) VALUES ('Grade 6') RETURNING id", &gradeID)
	mustScan("INSERT INTO classes (grade_id, academic_year_id, name) VALUES ($1, $2, '6-A') RETURNING id", &s.classID, gradeID, yearID)
	mustScan("INSERT INTO student_profiles (full_name, index_number) VALUES ('Nimali Perera', '2026/0001') RETURNING id", &s.studentID)
	mustScan("INSERT INTO student_profiles (full_name, index_number) VALUES ('Kasun Silva', '2026/0002') RETURNING id", &s.otherStudentID)
	mustScan("INSERT INTO guardians (full_name, relationship, phone, nic_number, email) VALUES ('Sunil Perera', 'father', '0712345678', '197512345678', 'sunil.office@example.com') RETURNING id", &s.guardianID)
	if _, err := pool.Exec(ctx, "INSERT INTO class_students (class_id, student_id) VALUES ($1, $2)", s.classID, s.studentID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, "INSERT INTO student_guardians (student_id, guardian_id) VALUES ($1, $2)", s.studentID, s.guardianID); err != nil {
		t.Fatal(err)
	}
	return s
}

func TestActivationFlowWithPostgres(t *testing.T) {
	pool := testdb.Open(t)
	ctx := context.Background()
	s := seed(t, pool)
	repo := NewRepository(pool)
	provider := &fakeIDP{userID: uuid.NewString()}
	mail := &fakeMail{}
	svc := NewService(repo, provider, mail, nil)
	svc.frontend = func() string { return "https://school.example" }
	svc.cipher = testCipher(t)
	admin := uuid.Nil

	// Everything starts switched off.
	if _, err := svc.Generate(ctx, GenerateRequest{Role: "student"}, admin); !errors.Is(err, ErrRoleDisabled) {
		t.Fatalf("default settings: err = %v, want ErrRoleDisabled", err)
	}
	if _, err := svc.UpdateSettings(ctx, Settings{StudentEnabled: true, ParentEnabled: true, CodeTTLDays: 7}, admin); err != nil {
		t.Fatalf("UpdateSettings: %v", err)
	}

	// Class filter narrows to the one enrolled student.
	byClass, err := svc.Generate(ctx, GenerateRequest{Role: "student", ClassID: &s.classID}, admin)
	if err != nil || len(byClass.Codes) != 1 || byClass.Codes[0].ClassName != "6-A" || byClass.Codes[0].GradeName != "Grade 6" || byClass.Codes[0].Index != "2026/0001" {
		t.Fatalf("class batch = %+v, %v", byClass, err)
	}
	// A second run reissues: the first code is revoked, not left live beside the new one.
	all, err := svc.Generate(ctx, GenerateRequest{Role: "student"}, admin)
	if err != nil || len(all.Codes) != 2 {
		t.Fatalf("all-students batch = %+v, %v", all, err)
	}
	var live int
	if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM activation_codes WHERE student_id = $1 AND revoked_at IS NULL", s.studentID).Scan(&live); err != nil || live != 1 {
		t.Fatalf("live codes for student = %d, %v", live, err)
	}

	oldCode, newCode := byClass.Codes[0].Code, ""
	for _, c := range all.Codes {
		if c.Name == "Nimali Perera" {
			newCode = c.Code
		}
	}
	start := StartRequest{Role: "student", Code: oldCode, Identifier: "2026/0001", Email: "nimali@example.com"}
	if err := svc.Start(ctx, start); err != nil || len(mail.to) != 0 {
		t.Fatalf("revoked code must not send mail: %v, %v", err, mail.to)
	}

	// Five wrong identifiers lock the code even when the right one follows.
	start.Code = newCode
	for i := 0; i < 5; i++ {
		start.Identifier = "wrong"
		if err := svc.Start(ctx, start); err != nil {
			t.Fatal(err)
		}
	}
	start.Identifier = "2026/0001"
	if err := svc.Start(ctx, start); err != nil || len(mail.to) != 0 {
		t.Fatalf("locked code sent mail: %v, %v", err, mail.to)
	}
	if _, err := pool.Exec(ctx, "UPDATE activation_codes SET locked_until = NOW() - INTERVAL '1 second' WHERE student_id = $1", s.studentID); err != nil {
		t.Fatal(err)
	}
	if err := svc.Start(ctx, start); err != nil || len(mail.to) != 1 {
		t.Fatalf("unlocked code: %v, mail %v", err, mail.to)
	}

	token := tokenFromMail(t, mail)
	if err := svc.Complete(ctx, CompleteRequest{Token: token, NewPassword: "a-Good-passphrase"}); err != nil {
		t.Fatalf("Complete: %v", err)
	}
	var linked uuid.UUID
	var mustChange bool
	if err := pool.QueryRow(ctx, `SELECT sp.user_id, u.must_change_password FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.id = $1`, s.studentID).Scan(&linked, &mustChange); err != nil {
		t.Fatalf("student not linked: %v", err)
	}
	if linked.String() != provider.userID || mustChange {
		t.Fatalf("linked %s (want %s), must_change_password %v", linked, provider.userID, mustChange)
	}
	if err := svc.Complete(ctx, CompleteRequest{Token: token, NewPassword: "a-Good-passphrase"}); !errors.Is(err, ErrLinkInvalid) {
		t.Fatalf("reused link: err = %v, want ErrLinkInvalid", err)
	}

	// Reprinting shows only the batch's unused codes, exactly as issued.
	reprint, err := svc.BatchCodes(ctx, all.BatchID, admin)
	if err != nil || len(reprint.Codes) != 1 || reprint.Codes[0].Name != "Kasun Silva" {
		t.Fatalf("reprint after one activation = %+v, %v", reprint, err)
	}
	for _, c := range all.Codes {
		if c.Name == "Kasun Silva" && c.Code != reprint.Codes[0].Code {
			t.Fatalf("reprinted %q, issued %q", reprint.Codes[0].Code, c.Code)
		}
	}

	// Activated students drop out of later batches; guardians use their NIC.
	again, err := svc.Generate(ctx, GenerateRequest{Role: "student"}, admin)
	if err != nil || len(again.Codes) != 1 || again.Codes[0].Name != "Kasun Silva" {
		t.Fatalf("later batch = %+v, %v", again, err)
	}
	parents, err := svc.Generate(ctx, GenerateRequest{Role: "parent", ClassID: &s.classID}, admin)
	if err != nil || len(parents.Codes) != 1 || parents.Codes[0].Detail != "Nimali Perera" || parents.Codes[0].ClassName != "6-A" || parents.Codes[0].Index != "" {
		t.Fatalf("parent batch = %+v, %v", parents, err)
	}
	provider.userID = uuid.NewString()
	parentStart := StartRequest{Role: "parent", Code: parents.Codes[0].Code, Identifier: "197512345678", Email: "sunil@example.com"}
	if err := svc.Start(ctx, parentStart); err != nil || len(mail.to) != 2 {
		t.Fatalf("parent start: %v, mail %v", err, mail.to)
	}
	mail.body = mail.body[1:]
	if err := svc.Complete(ctx, CompleteRequest{Token: tokenFromMail(t, mail), NewPassword: "another-Good-one"}); err != nil {
		t.Fatalf("parent Complete: %v", err)
	}
	var guardianEmail string
	// The email already on file is kept; the verified one becomes the login email.
	if err := pool.QueryRow(ctx, "SELECT email FROM guardians WHERE id = $1 AND user_id IS NOT NULL", s.guardianID).Scan(&guardianEmail); err != nil || guardianEmail != "sunil.office@example.com" {
		t.Fatalf("guardian link: %q, %v", guardianEmail, err)
	}

	// Revoking a batch leaves used codes alone.
	batches, err := svc.Batches(ctx)
	if err != nil || len(batches) != 4 {
		t.Fatalf("batches = %d, %v", len(batches), err)
	}
	n, err := svc.RevokeBatch(ctx, again.BatchID, admin)
	if err != nil || n != 1 {
		t.Fatalf("revoked %d, %v", n, err)
	}
	if !time.Now().Before(again.ExpiresAt) {
		t.Fatal("codes should expire in the future")
	}
}
