package attendance

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

var ErrStaffAttendanceAmbiguous = errors.New("exactly one of teacher_id or non_academic_staff_id is required")

type StaffRecord struct {
	ID                 uuid.UUID          `json:"id"`
	TeacherID          pgtype.UUID        `json:"teacher_id"`
	NonAcademicStaffID pgtype.UUID        `json:"non_academic_staff_id"`
	Date               pgtype.Date        `json:"date"`
	Status             string             `json:"status"`
	MarkedBy           pgtype.UUID        `json:"marked_by"`
	Note               pgtype.Text        `json:"note"`
	CreatedAt          pgtype.Timestamptz `json:"created_at"`
	UpdatedAt          pgtype.Timestamptz `json:"updated_at"`
}

type staffDirectoryRow struct {
	ID, RecordID             uuid.UUID
	FullName, EmployeeNumber string
	Status, Note             string
}

type staffSummaryRow struct {
	ID                                               uuid.UUID
	FullName                                         string
	PresentCount, LateCount, AbsentCount, LeaveCount int64
}

type staffStore interface {
	upsertTeacher(context.Context, uuid.UUID, time.Time, string, uuid.UUID, string) (StaffRecord, error)
	upsertNonAcademic(context.Context, uuid.UUID, time.Time, string, uuid.UUID, string) (StaffRecord, error)
	teachersByDate(context.Context, time.Time) ([]staffDirectoryRow, error)
	nonAcademicByDate(context.Context, time.Time) ([]staffDirectoryRow, error)
	teacherSummary(context.Context, time.Time, time.Time) ([]staffSummaryRow, error)
	nonAcademicSummary(context.Context, time.Time, time.Time) ([]staffSummaryRow, error)
	teacherHistory(context.Context, uuid.UUID, time.Time, time.Time) ([]StaffRecord, error)
	nonAcademicHistory(context.Context, uuid.UUID, time.Time, time.Time) ([]StaffRecord, error)
	roster(context.Context, time.Time, StaffRosterQuery) (StaffRosterPage, error)
	monthly(context.Context, time.Time, time.Time, StaffRosterQuery) (StaffMonthlyPage, error)
	markUnmarkedPresent(context.Context, time.Time, StaffKind, uuid.UUID) (int64, error)
}

type StaffHistoryReader interface {
	TeacherHistory(context.Context, uuid.UUID, time.Time, time.Time) ([]StaffRecord, error)
}

type StaffService struct{ store staffStore }

func NewStaffService(store staffStore) *StaffService { return &StaffService{store: store} }

func (s *StaffService) Mark(ctx context.Context, req MarkStaffAttendanceRequest, markedBy uuid.UUID) (StaffRecord, error) {
	hasTeacher := req.TeacherID != ""
	hasStaff := req.NonAcademicStaffID != ""
	if hasTeacher == hasStaff {
		return StaffRecord{}, ErrStaffAttendanceAmbiguous
	}
	if hasTeacher {
		id, err := uuid.Parse(req.TeacherID)
		if err != nil {
			return StaffRecord{}, fmt.Errorf("invalid teacher id")
		}
		return s.store.upsertTeacher(ctx, id, req.Date, req.Status, markedBy, req.Note)
	}
	id, err := uuid.Parse(req.NonAcademicStaffID)
	if err != nil {
		return StaffRecord{}, fmt.Errorf("invalid staff id")
	}
	return s.store.upsertNonAcademic(ctx, id, req.Date, req.Status, markedBy, req.Note)
}

func (s *StaffService) ListByDate(ctx context.Context, date time.Time) ([]StaffAttendanceRow, []StaffAttendanceRow, error) {
	teachers, err := s.store.teachersByDate(ctx, date)
	if err != nil {
		return nil, nil, err
	}
	staff, err := s.store.nonAcademicByDate(ctx, date)
	if err != nil {
		return nil, nil, err
	}
	return mapDirectoryRows(teachers), mapDirectoryRows(staff), nil
}

func mapDirectoryRows(rows []staffDirectoryRow) []StaffAttendanceRow {
	out := make([]StaffAttendanceRow, len(rows))
	for i, row := range rows {
		out[i] = row.toRow()
	}
	return out
}

func (s *StaffService) MonthlySummary(ctx context.Context, from, to time.Time) ([]StaffAttendanceSummaryRow, []StaffAttendanceSummaryRow, error) {
	teachers, err := s.store.teacherSummary(ctx, from, to)
	if err != nil {
		return nil, nil, err
	}
	staff, err := s.store.nonAcademicSummary(ctx, from, to)
	if err != nil {
		return nil, nil, err
	}
	return mapSummaryRows(teachers), mapSummaryRows(staff), nil
}

func mapSummaryRows(rows []staffSummaryRow) []StaffAttendanceSummaryRow {
	out := make([]StaffAttendanceSummaryRow, len(rows))
	for i, row := range rows {
		out[i] = StaffAttendanceSummaryRow{StaffID: row.ID.String(), FullName: row.FullName, PresentCount: row.PresentCount, LateCount: row.LateCount, AbsentCount: row.AbsentCount, LeaveCount: row.LeaveCount}
	}
	return out
}

func (s *StaffService) TeacherHistory(ctx context.Context, id uuid.UUID, from, to time.Time) ([]StaffRecord, error) {
	return s.store.teacherHistory(ctx, id, from, to)
}

func (s *StaffService) NonAcademicHistory(ctx context.Context, id uuid.UUID, from, to time.Time) ([]StaffRecord, error) {
	return s.store.nonAcademicHistory(ctx, id, from, to)
}

// Roster returns one page of the day's roster for teachers or non-academic staff.
func (s *StaffService) Roster(ctx context.Context, date time.Time, q StaffRosterQuery) (StaffRosterPage, error) {
	return s.store.roster(ctx, date, q)
}

// Monthly returns one page of per-person status counts for the range.
func (s *StaffService) Monthly(ctx context.Context, from, to time.Time, q StaffRosterQuery) (StaffMonthlyPage, error) {
	return s.store.monthly(ctx, from, to, q)
}

// MarkUnmarkedPresent marks everyone of the kind with no record that day as present, so the clerk only fixes exceptions.
func (s *StaffService) MarkUnmarkedPresent(ctx context.Context, req MarkUnmarkedRequest, markedBy uuid.UUID) (int64, error) {
	return s.store.markUnmarkedPresent(ctx, req.Date, req.Kind, markedBy)
}

func (r staffDirectoryRow) toRow() StaffAttendanceRow {
	row := StaffAttendanceRow{StaffID: r.ID.String(), FullName: r.FullName, EmployeeNumber: r.EmployeeNumber, Status: r.Status, Note: r.Note}
	if r.RecordID != uuid.Nil {
		row.RecordID = r.RecordID.String()
	}
	return row
}
