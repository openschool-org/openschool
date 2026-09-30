package attendance

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/openschool-org/openschool/internal/authz"
)

type fakeStore struct {
	session     Session
	records     []Record
	marked      []MarkInput
	assigned    bool
	userPresent bool
}

func (f *fakeStore) createSession(context.Context, uuid.UUID, uuid.UUID, time.Time) (Session, error) {
	return f.session, nil
}
func (f *fakeStore) getSession(context.Context, uuid.UUID) (Session, error) { return f.session, nil }
func (f *fakeStore) findSession(context.Context, uuid.UUID, time.Time) (Session, error) {
	return Session{}, errors.New("not found")
}
func (f *fakeStore) listSessionsByClass(context.Context, uuid.UUID) ([]Session, error) {
	return nil, nil
}
func (f *fakeStore) listSessionsByDate(context.Context, time.Time, []uuid.UUID) ([]DailySession, error) {
	return nil, nil
}
func (f *fakeStore) deleteSession(context.Context, uuid.UUID) error           { return nil }
func (f *fakeStore) listRecords(context.Context, uuid.UUID) ([]Record, error) { return f.records, nil }
func (f *fakeStore) markBatch(_ context.Context, sessionID uuid.UUID, input []MarkInput, _ []uuid.UUID) ([]Record, error) {
	f.marked = append([]MarkInput(nil), input...)
	rows := make([]Record, len(input))
	for i, value := range input {
		rows[i] = Record{ID: uuid.New(), SessionID: sessionID, StudentID: value.StudentID, Status: value.Status, Note: pgtype.Text{String: value.Note, Valid: value.Note != ""}}
	}
	return rows, nil
}
func (f *fakeStore) listBySession(context.Context, uuid.UUID) ([]SessionRecord, error) {
	return nil, nil
}
func (f *fakeStore) listByStudent(context.Context, uuid.UUID) ([]StudentRecord, error) {
	return nil, nil
}
func (f *fakeStore) summary(context.Context, uuid.UUID, uuid.UUID) (Summary, error) {
	return Summary{}, nil
}
func (f *fakeStore) userExists(context.Context, uuid.UUID) bool { return f.userPresent }
func (f *fakeStore) userByEmail(context.Context, string) (uuid.UUID, error) {
	return uuid.Nil, errors.New("not found")
}
func (f *fakeStore) createUser(_ context.Context, actor Actor) (uuid.UUID, error) {
	return actor.ID, nil
}
func (f *fakeStore) teacherByUser(context.Context, uuid.UUID) (uuid.UUID, error) {
	return uuid.New(), nil
}
func (f *fakeStore) teacherAssigned(context.Context, uuid.UUID, uuid.UUID) (bool, error) {
	return f.assigned, nil
}
func (f *fakeStore) studentClass(context.Context, uuid.UUID) (uuid.UUID, error) {
	return f.session.ClassID, nil
}
func (f *fakeStore) guardianUsers(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	return []uuid.UUID{uuid.New()}, nil
}
func (f *fakeStore) studentName(context.Context, uuid.UUID) (string, error) {
	return "Ada Student", nil
}
func (f *fakeStore) className(context.Context, uuid.UUID) (string, error)   { return "10-A", nil }
func (f *fakeStore) currentAcademicYear(context.Context) (uuid.UUID, error) { return uuid.New(), nil }
func (f *fakeStore) listReportRows(context.Context, uuid.UUID, time.Time, time.Time) ([]ReportRow, error) {
	return nil, nil
}

type fakeAuditor struct{ calls int }

func (a *fakeAuditor) Record(context.Context, string, uuid.UUID, string, uuid.UUID, interface{}, interface{}, string) error {
	a.calls++
	return nil
}

type fakeNotifier struct{ calls int }

func (n *fakeNotifier) SendDirect(context.Context, string, string, string, string, uuid.UUID, []uuid.UUID) error {
	n.calls++
	return nil
}

func testSession(created time.Time) Session {
	return Session{ID: uuid.New(), ClassID: uuid.New(), TakenBy: uuid.New(), Date: pgtype.Date{Time: time.Date(2026, 9, 14, 0, 0, 0, 0, time.UTC), Valid: true}, CreatedAt: pgtype.Timestamptz{Time: created, Valid: true}}
}

func TestTeacherCannotEditLockedSession(t *testing.T) {
	now := time.Date(2026, 9, 14, 12, 0, 0, 0, time.UTC)
	store := &fakeStore{session: testSession(now.Add(-25 * time.Hour)), assigned: true, userPresent: true}
	service := NewService(store, nil, nil, nil)
	service.now = func() time.Time { return now }

	err := service.MarkAttendance(context.Background(), Actor{ID: uuid.New(), Role: authz.RoleTeacher}, store.session.ID, MarkAttendanceRequest{})
	if !errors.Is(err, ErrSessionLocked) {
		t.Fatalf("expected ErrSessionLocked, got %v", err)
	}
	if len(store.marked) != 0 {
		t.Fatal("locked session was written")
	}
}

func TestMarkAttendanceValidatesWholeBatchBeforeWrite(t *testing.T) {
	now := time.Now()
	store := &fakeStore{session: testSession(now), userPresent: true}
	service := NewService(store, nil, nil, nil)
	service.now = func() time.Time { return now }

	err := service.MarkAttendance(context.Background(), Actor{ID: uuid.New(), Role: authz.RoleAdmin}, store.session.ID, MarkAttendanceRequest{Records: []AttendanceRecord{{StudentID: uuid.NewString(), Status: AttendanceStatusPresent}, {StudentID: "bad-id", Status: AttendanceStatusAbsent}}})
	if err == nil {
		t.Fatal("expected invalid student error")
	}
	if len(store.marked) != 0 {
		t.Fatal("batch was written before all records were validated")
	}
}

func TestAdminLockedCorrectionIsAuditedAndNewAbsenceNotified(t *testing.T) {
	now := time.Date(2026, 9, 14, 12, 0, 0, 0, time.UTC)
	studentID := uuid.New()
	store := &fakeStore{session: testSession(now.Add(-25 * time.Hour)), userPresent: true}
	auditor := &fakeAuditor{}
	notifier := &fakeNotifier{}
	service := NewService(store, notifier, auditor, nil)
	service.now = func() time.Time { return now }

	err := service.MarkAttendance(context.Background(), Actor{ID: uuid.New(), Role: authz.RoleAdmin}, store.session.ID, MarkAttendanceRequest{Records: []AttendanceRecord{{StudentID: studentID.String(), Status: AttendanceStatusAbsent}}, Reason: "verified correction"})
	if err != nil {
		t.Fatalf("mark attendance: %v", err)
	}
	if auditor.calls != 1 {
		t.Fatalf("expected one audit call, got %d", auditor.calls)
	}
	if notifier.calls != 1 {
		t.Fatalf("expected one notification call, got %d", notifier.calls)
	}
}
