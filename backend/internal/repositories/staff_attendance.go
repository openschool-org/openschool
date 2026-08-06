package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type StaffAttendanceRepository struct {
	queries *db.Queries
}

func NewStaffAttendanceRepository(pool *pgxpool.Pool) *StaffAttendanceRepository {
	return &StaffAttendanceRepository{queries: db.New(pool)}
}

func dateParam(t time.Time) pgtype.Date {
	return pgtype.Date{Time: t, Valid: true}
}

func (r *StaffAttendanceRepository) UpsertTeacherAttendance(ctx context.Context, teacherID uuid.UUID, date time.Time, status string, markedBy uuid.UUID, note string) (db.StaffAttendanceRecord, error) {
	return r.queries.UpsertTeacherAttendance(ctx, db.UpsertTeacherAttendanceParams{
		TeacherID: pgtype.UUID{Bytes: teacherID, Valid: true},
		Date:      dateParam(date),
		Status:    status,
		MarkedBy:  pgtype.UUID{Bytes: markedBy, Valid: true},
		Note:      pgtype.Text{String: note, Valid: note != ""},
	})
}

func (r *StaffAttendanceRepository) UpsertNonAcademicStaffAttendance(ctx context.Context, staffID uuid.UUID, date time.Time, status string, markedBy uuid.UUID, note string) (db.StaffAttendanceRecord, error) {
	return r.queries.UpsertNonAcademicStaffAttendance(ctx, db.UpsertNonAcademicStaffAttendanceParams{
		NonAcademicStaffID: pgtype.UUID{Bytes: staffID, Valid: true},
		Date:               dateParam(date),
		Status:             status,
		MarkedBy:           pgtype.UUID{Bytes: markedBy, Valid: true},
		Note:               pgtype.Text{String: note, Valid: note != ""},
	})
}

func (r *StaffAttendanceRepository) ListTeacherAttendanceByDate(ctx context.Context, date time.Time) ([]db.ListTeacherAttendanceByDateRow, error) {
	return r.queries.ListTeacherAttendanceByDate(ctx, dateParam(date))
}

func (r *StaffAttendanceRepository) ListNonAcademicStaffAttendanceByDate(ctx context.Context, date time.Time) ([]db.ListNonAcademicStaffAttendanceByDateRow, error) {
	return r.queries.ListNonAcademicStaffAttendanceByDate(ctx, dateParam(date))
}

func (r *StaffAttendanceRepository) ListTeacherAttendanceHistory(ctx context.Context, teacherID uuid.UUID, from, to time.Time) ([]db.StaffAttendanceRecord, error) {
	return r.queries.ListTeacherAttendanceHistory(ctx, db.ListTeacherAttendanceHistoryParams{
		TeacherID: pgtype.UUID{Bytes: teacherID, Valid: true},
		Date:      dateParam(from),
		Date_2:    dateParam(to),
	})
}

func (r *StaffAttendanceRepository) ListNonAcademicStaffAttendanceHistory(ctx context.Context, staffID uuid.UUID, from, to time.Time) ([]db.StaffAttendanceRecord, error) {
	return r.queries.ListNonAcademicStaffAttendanceHistory(ctx, db.ListNonAcademicStaffAttendanceHistoryParams{
		NonAcademicStaffID: pgtype.UUID{Bytes: staffID, Valid: true},
		Date:               dateParam(from),
		Date_2:             dateParam(to),
	})
}

func (r *StaffAttendanceRepository) MonthlyTeacherSummary(ctx context.Context, from, to time.Time) ([]db.MonthlyTeacherAttendanceSummaryRow, error) {
	return r.queries.MonthlyTeacherAttendanceSummary(ctx, db.MonthlyTeacherAttendanceSummaryParams{
		Date:   dateParam(from),
		Date_2: dateParam(to),
	})
}

func (r *StaffAttendanceRepository) MonthlyNonAcademicStaffSummary(ctx context.Context, from, to time.Time) ([]db.MonthlyNonAcademicStaffAttendanceSummaryRow, error) {
	return r.queries.MonthlyNonAcademicStaffAttendanceSummary(ctx, db.MonthlyNonAcademicStaffAttendanceSummaryParams{
		Date:   dateParam(from),
		Date_2: dateParam(to),
	})
}
