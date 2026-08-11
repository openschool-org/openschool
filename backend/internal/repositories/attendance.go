package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type AttendanceRepository struct {
	queries *db.Queries
}

func NewAttendanceRepository(pool *pgxpool.Pool) *AttendanceRepository {
	return &AttendanceRepository{queries: db.New(pool)}
}

func (r *AttendanceRepository) CreateSession(ctx context.Context, classID uuid.UUID, takenBy uuid.UUID, date time.Time) (db.AttendanceSession, error) {
	return r.queries.CreateAttendanceSession(ctx, db.CreateAttendanceSessionParams{
		ClassID: classID,
		TakenBy: takenBy,
		Date:    pgtype.Date{Time: date, Valid: true},
	})
}

func (r *AttendanceRepository) GetSessionByID(ctx context.Context, id uuid.UUID) (db.AttendanceSession, error) {
	return r.queries.GetAttendanceSessionByID(ctx, id)
}

func (r *AttendanceRepository) GetSessionByClassAndDate(ctx context.Context, classID uuid.UUID, date time.Time) (db.AttendanceSession, error) {
	return r.queries.GetAttendanceSessionByClassAndDate(ctx, db.GetAttendanceSessionByClassAndDateParams{
		ClassID: classID,
		Date:    pgtype.Date{Time: date, Valid: true},
	})
}

func (r *AttendanceRepository) ListSessionsByClass(ctx context.Context, classID uuid.UUID) ([]db.AttendanceSession, error) {
	return r.queries.ListAttendanceSessionsByClass(ctx, classID)
}

// ListSessionsByDate returns every attendance session on the given date. A
// nil gradeIDs means unfiltered (whole-school callers); a non-nil slice
// restricts results to those grades at the SQL WHERE clause level.
func (r *AttendanceRepository) ListSessionsByDate(ctx context.Context, date time.Time, gradeIDs []uuid.UUID) ([]db.ListAttendanceSessionsByDateRow, error) {
	return r.queries.ListAttendanceSessionsByDate(ctx, db.ListAttendanceSessionsByDateParams{
		Date:     pgtype.Date{Time: date, Valid: true},
		GradeIds: gradeIDs,
	})
}

func (r *AttendanceRepository) DeleteSession(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteAttendanceSession(ctx, id)
}

func (r *AttendanceRepository) MarkAttendance(ctx context.Context, sessionID uuid.UUID, studentID uuid.UUID, status string, note string) (db.AttendanceRecord, error) {
	return r.queries.MarkAttendance(ctx, db.MarkAttendanceParams{
		SessionID: sessionID,
		StudentID: studentID,
		Status:    status,
		Note:      pgtype.Text{String: note, Valid: note != ""},
	})
}

// GetRecord returns the existing attendance record for a session+student,
// or pgx.ErrNoRows if the student hasn't been marked yet this session —
// used to detect status transitions (e.g. into "absent") before upserting.
func (r *AttendanceRepository) GetRecord(ctx context.Context, sessionID, studentID uuid.UUID) (db.AttendanceRecord, error) {
	return r.queries.GetAttendanceRecord(ctx, db.GetAttendanceRecordParams{SessionID: sessionID, StudentID: studentID})
}

func (r *AttendanceRepository) ListBySession(ctx context.Context, sessionID uuid.UUID) ([]db.ListAttendanceBySessionRow, error) {
	return r.queries.ListAttendanceBySession(ctx, sessionID)
}

func (r *AttendanceRepository) ListByStudent(ctx context.Context, studentID uuid.UUID) ([]db.ListAttendanceByStudentRow, error) {
	return r.queries.ListAttendanceByStudent(ctx, studentID)
}

func (r *AttendanceRepository) GetSummaryByStudent(ctx context.Context, studentID uuid.UUID, classID uuid.UUID) (db.GetAttendanceSummaryByStudentRow, error) {
	return r.queries.GetAttendanceSummaryByStudent(ctx, db.GetAttendanceSummaryByStudentParams{
		StudentID: studentID,
		ClassID:   classID,
	})
}

func (r *AttendanceRepository) ListForClassInRange(ctx context.Context, classID uuid.UUID, from, to time.Time) ([]db.ListAttendanceRecordsForClassInRangeRow, error) {
	return r.queries.ListAttendanceRecordsForClassInRange(ctx, db.ListAttendanceRecordsForClassInRangeParams{
		ClassID: classID,
		Date:    pgtype.Date{Time: from, Valid: true},
		Date_2:  pgtype.Date{Time: to, Valid: true},
	})
}
