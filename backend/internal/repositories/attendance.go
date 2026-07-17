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

func (r *AttendanceRepository) ListSessionsByDate(ctx context.Context, date time.Time) ([]db.ListAttendanceSessionsByDateRow, error) {
	return r.queries.ListAttendanceSessionsByDate(ctx, pgtype.Date{Time: date, Valid: true})
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

func (r *TeacherRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (db.TeacherProfile, error) {
	return r.queries.GetTeacherByUserID(ctx, userID)
}
