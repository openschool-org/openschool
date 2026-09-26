package attendance

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
)

type fakeStaffStore struct {
	teacherCalls, staffCalls int
	teachers, staff          []staffDirectoryRow
}

func (f *fakeStaffStore) upsertTeacher(context.Context, uuid.UUID, time.Time, string, uuid.UUID, string) (StaffRecord, error) {
	f.teacherCalls++
	return StaffRecord{}, nil
}
func (f *fakeStaffStore) upsertNonAcademic(context.Context, uuid.UUID, time.Time, string, uuid.UUID, string) (StaffRecord, error) {
	f.staffCalls++
	return StaffRecord{}, nil
}
func (f *fakeStaffStore) teachersByDate(context.Context, time.Time) ([]staffDirectoryRow, error) {
	return f.teachers, nil
}
func (f *fakeStaffStore) nonAcademicByDate(context.Context, time.Time) ([]staffDirectoryRow, error) {
	return f.staff, nil
}
func (f *fakeStaffStore) teacherSummary(context.Context, time.Time, time.Time) ([]staffSummaryRow, error) {
	return nil, nil
}
func (f *fakeStaffStore) nonAcademicSummary(context.Context, time.Time, time.Time) ([]staffSummaryRow, error) {
	return nil, nil
}
func (f *fakeStaffStore) roster(context.Context, time.Time, StaffRosterQuery) (StaffRosterPage, error) {
	return StaffRosterPage{}, nil
}
func (f *fakeStaffStore) monthly(context.Context, time.Time, time.Time, StaffRosterQuery) (StaffMonthlyPage, error) {
	return StaffMonthlyPage{}, nil
}
func (f *fakeStaffStore) markUnmarkedPresent(context.Context, time.Time, StaffKind, uuid.UUID) (int64, error) {
	return 0, nil
}
func (f *fakeStaffStore) teacherHistory(context.Context, uuid.UUID, time.Time, time.Time) ([]StaffRecord, error) {
	return nil, nil
}
func (f *fakeStaffStore) nonAcademicHistory(context.Context, uuid.UUID, time.Time, time.Time) ([]StaffRecord, error) {
	return nil, nil
}

func TestStaffMarkRequiresExactlyOneTarget(t *testing.T) {
	service := NewStaffService(&fakeStaffStore{})
	for _, req := range []MarkStaffAttendanceRequest{{}, {TeacherID: uuid.NewString(), NonAcademicStaffID: uuid.NewString()}} {
		_, err := service.Mark(context.Background(), req, uuid.New())
		if !errors.Is(err, ErrStaffAttendanceAmbiguous) {
			t.Fatalf("expected ambiguous target error, got %v", err)
		}
	}
}

func TestStaffMarkDispatchesByTargetType(t *testing.T) {
	store := &fakeStaffStore{}
	service := NewStaffService(store)
	date := time.Date(2026, 9, 14, 0, 0, 0, 0, time.UTC)
	if _, err := service.Mark(context.Background(), MarkStaffAttendanceRequest{TeacherID: uuid.NewString(), Date: date, Status: "present"}, uuid.New()); err != nil {
		t.Fatal(err)
	}
	if _, err := service.Mark(context.Background(), MarkStaffAttendanceRequest{NonAcademicStaffID: uuid.NewString(), Date: date, Status: "leave"}, uuid.New()); err != nil {
		t.Fatal(err)
	}
	if store.teacherCalls != 1 || store.staffCalls != 1 {
		t.Fatalf("unexpected dispatch counts: teachers=%d staff=%d", store.teacherCalls, store.staffCalls)
	}
}

func TestStaffDirectoryMappingPreservesUnmarkedRows(t *testing.T) {
	id := uuid.New()
	store := &fakeStaffStore{teachers: []staffDirectoryRow{{ID: id, FullName: "Ada Teacher", EmployeeNumber: "T-001"}}}
	teachers, staff, err := NewStaffService(store).ListByDate(context.Background(), time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if len(staff) != 0 || len(teachers) != 1 {
		t.Fatalf("unexpected row counts: teachers=%d staff=%d", len(teachers), len(staff))
	}
	if teachers[0].StaffID != id.String() || teachers[0].RecordID != "" || teachers[0].Status != "" {
		t.Fatalf("unexpected mapped row: %#v", teachers[0])
	}
}
