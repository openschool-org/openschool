package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

var ErrStaffAttendanceAmbiguous = errors.New("exactly one of teacher_id or non_academic_staff_id is required")

type StaffAttendanceService struct {
	repo *repositories.StaffAttendanceRepository
}

func NewStaffAttendanceService(repo *repositories.StaffAttendanceRepository) *StaffAttendanceService {
	return &StaffAttendanceService{repo: repo}
}

// MarkAttendance upserts a single staff member's attendance for a date —
// exactly one of TeacherID/NonAcademicStaffID must be set, mirroring the
// staff_attendance_exactly_one_staff DB constraint.
func (s *StaffAttendanceService) MarkAttendance(ctx context.Context, req models.MarkStaffAttendanceRequest, markedBy uuid.UUID) (db.StaffAttendanceRecord, error) {
	hasTeacher := req.TeacherID != ""
	hasStaff := req.NonAcademicStaffID != ""
	if hasTeacher == hasStaff {
		return db.StaffAttendanceRecord{}, ErrStaffAttendanceAmbiguous
	}

	if hasTeacher {
		id, err := uuid.Parse(req.TeacherID)
		if err != nil {
			return db.StaffAttendanceRecord{}, fmt.Errorf("invalid teacher id")
		}
		return s.repo.UpsertTeacherAttendance(ctx, id, req.Date, req.Status, markedBy, req.Note)
	}

	id, err := uuid.Parse(req.NonAcademicStaffID)
	if err != nil {
		return db.StaffAttendanceRecord{}, fmt.Errorf("invalid staff id")
	}
	return s.repo.UpsertNonAcademicStaffAttendance(ctx, id, req.Date, req.Status, markedBy, req.Note)
}

func (s *StaffAttendanceService) ListByDate(ctx context.Context, date time.Time) ([]models.StaffAttendanceRow, []models.StaffAttendanceRow, error) {
	teacherRows, err := s.repo.ListTeacherAttendanceByDate(ctx, date)
	if err != nil {
		return nil, nil, err
	}
	staffRows, err := s.repo.ListNonAcademicStaffAttendanceByDate(ctx, date)
	if err != nil {
		return nil, nil, err
	}

	teachers := make([]models.StaffAttendanceRow, 0, len(teacherRows))
	for _, r := range teacherRows {
		row := models.StaffAttendanceRow{
			StaffID:        r.TeacherID.String(),
			FullName:       r.FullName,
			EmployeeNumber: r.EmployeeNumber,
			Status:         r.Status.String,
		}
		if r.RecordID.Valid {
			row.RecordID = uuid.UUID(r.RecordID.Bytes).String()
		}
		if r.Note.Valid {
			row.Note = r.Note.String
		}
		teachers = append(teachers, row)
	}

	staff := make([]models.StaffAttendanceRow, 0, len(staffRows))
	for _, r := range staffRows {
		row := models.StaffAttendanceRow{
			StaffID:        r.StaffID.String(),
			FullName:       r.FullName,
			EmployeeNumber: r.EmployeeNumber,
			Status:         r.Status.String,
		}
		if r.RecordID.Valid {
			row.RecordID = uuid.UUID(r.RecordID.Bytes).String()
		}
		if r.Note.Valid {
			row.Note = r.Note.String
		}
		staff = append(staff, row)
	}

	return teachers, staff, nil
}

// MonthlySummary returns per-status counts for every active teacher and
// non-academic staff member across [from, to] (the caller passes the first
// and last day of the target month).
func (s *StaffAttendanceService) MonthlySummary(ctx context.Context, from, to time.Time) ([]models.StaffAttendanceSummaryRow, []models.StaffAttendanceSummaryRow, error) {
	teacherRows, err := s.repo.MonthlyTeacherSummary(ctx, from, to)
	if err != nil {
		return nil, nil, err
	}
	staffRows, err := s.repo.MonthlyNonAcademicStaffSummary(ctx, from, to)
	if err != nil {
		return nil, nil, err
	}

	teachers := make([]models.StaffAttendanceSummaryRow, 0, len(teacherRows))
	for _, r := range teacherRows {
		teachers = append(teachers, models.StaffAttendanceSummaryRow{
			StaffID:      r.TeacherID.String(),
			FullName:     r.FullName,
			PresentCount: r.PresentCount,
			LateCount:    r.LateCount,
			AbsentCount:  r.AbsentCount,
			LeaveCount:   r.LeaveCount,
		})
	}

	staff := make([]models.StaffAttendanceSummaryRow, 0, len(staffRows))
	for _, r := range staffRows {
		staff = append(staff, models.StaffAttendanceSummaryRow{
			StaffID:      r.StaffID.String(),
			FullName:     r.FullName,
			PresentCount: r.PresentCount,
			LateCount:    r.LateCount,
			AbsentCount:  r.AbsentCount,
			LeaveCount:   r.LeaveCount,
		})
	}

	return teachers, staff, nil
}

func (s *StaffAttendanceService) TeacherHistory(ctx context.Context, teacherID uuid.UUID, from, to time.Time) ([]db.StaffAttendanceRecord, error) {
	return s.repo.ListTeacherAttendanceHistory(ctx, teacherID, from, to)
}

func (s *StaffAttendanceService) NonAcademicStaffHistory(ctx context.Context, staffID uuid.UUID, from, to time.Time) ([]db.StaffAttendanceRecord, error) {
	return s.repo.ListNonAcademicStaffAttendanceHistory(ctx, staffID, from, to)
}
