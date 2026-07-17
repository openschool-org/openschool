package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

type AttendanceService struct {
	repo        *repositories.AttendanceRepository
	teacherRepo *repositories.TeacherRepository
	classRepo   *repositories.ClassRepository
}

func NewAttendanceService(repo *repositories.AttendanceRepository, teacherRepo *repositories.TeacherRepository, classRepo *repositories.ClassRepository) *AttendanceService {
	return &AttendanceService{repo: repo, teacherRepo: teacherRepo, classRepo: classRepo}
}

// CreateSession attributes the session to a teacher_profiles row — the
// schema requires one (taken_by is NOT NULL). A teacher account uses their
// own profile; an admin has none, so the session is attributed to the
// class's assigned form teacher instead.
func (s *AttendanceService) CreateSession(ctx context.Context, userID uuid.UUID, isAdmin bool, req models.CreateAttendanceSessionRequest) (db.AttendanceSession, error) {
	classID, err := uuid.Parse(req.ClassID)
	if err != nil {
		return db.AttendanceSession{}, fmt.Errorf("invalid class id")
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return db.AttendanceSession{}, fmt.Errorf("invalid date format, use YYYY-MM-DD")
	}

	takenBy, err := s.resolveTakenBy(ctx, userID, isAdmin, classID)
	if err != nil {
		return db.AttendanceSession{}, err
	}

	// check session doesn't already exist
	_, err = s.repo.GetSessionByClassAndDate(ctx, classID, date)
	if err == nil {
		return db.AttendanceSession{}, fmt.Errorf("attendance session already exists for this class on this date")
	}

	return s.repo.CreateSession(ctx, classID, takenBy, date)
}

func (s *AttendanceService) resolveTakenBy(ctx context.Context, userID uuid.UUID, isAdmin bool, classID uuid.UUID) (uuid.UUID, error) {
	// a teacher account (whether or not they also hold admin) is attributed
	// to their own profile
	if teacher, err := s.teacherRepo.GetByUserID(ctx, userID); err == nil {
		return teacher.ID, nil
	}

	if !isAdmin {
		return uuid.UUID{}, fmt.Errorf("only teachers can create attendance sessions")
	}

	class, err := s.classRepo.GetByID(ctx, classID)
	if err != nil {
		return uuid.UUID{}, fmt.Errorf("class not found")
	}
	if !class.FormTeacherID.Valid {
		return uuid.UUID{}, fmt.Errorf("this class has no assigned class teacher — assign one before creating a session as an admin")
	}

	return uuid.UUID(class.FormTeacherID.Bytes), nil
}
func (s *AttendanceService) GetSession(ctx context.Context, id uuid.UUID) (db.AttendanceSession, error) {
	return s.repo.GetSessionByID(ctx, id)
}

// DeleteSession removes a session and, via ON DELETE CASCADE, every
// attendance record already written for it.
func (s *AttendanceService) DeleteSession(ctx context.Context, id uuid.UUID) error {
	if _, err := s.repo.GetSessionByID(ctx, id); err != nil {
		return fmt.Errorf("attendance session not found")
	}
	return s.repo.DeleteSession(ctx, id)
}

func (s *AttendanceService) ListSessionsByClass(ctx context.Context, classID uuid.UUID) ([]db.AttendanceSession, error) {
	return s.repo.ListSessionsByClass(ctx, classID)
}

func (s *AttendanceService) ListSessionsByDate(ctx context.Context, dateStr string) ([]db.ListAttendanceSessionsByDateRow, error) {
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, fmt.Errorf("invalid date format, use YYYY-MM-DD")
	}
	return s.repo.ListSessionsByDate(ctx, date)
}

func (s *AttendanceService) MarkAttendance(ctx context.Context, sessionID uuid.UUID, req models.MarkAttendanceRequest) error {
	// verify session exists
	_, err := s.repo.GetSessionByID(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("attendance session not found")
	}

	for _, record := range req.Records {
		studentID, err := uuid.Parse(record.StudentID)
		if err != nil {
			return fmt.Errorf("invalid student id: %s", record.StudentID)
		}

		if record.Status != "present" && record.Status != "absent" && record.Status != "late" && record.Status != "excused" {
			return fmt.Errorf("invalid status: %s — must be present, absent, late or excused", record.Status)
		}

		_, err = s.repo.MarkAttendance(ctx, sessionID, studentID, record.Status, record.Note)
		if err != nil {
			return fmt.Errorf("failed to mark attendance for student %s: %w", record.StudentID, err)
		}
	}

	return nil
}

func (s *AttendanceService) ListBySession(ctx context.Context, sessionID uuid.UUID) ([]db.ListAttendanceBySessionRow, error) {
	return s.repo.ListBySession(ctx, sessionID)
}

func (s *AttendanceService) ListByStudent(ctx context.Context, studentID uuid.UUID) ([]db.ListAttendanceByStudentRow, error) {
	return s.repo.ListByStudent(ctx, studentID)
}

func (s *AttendanceService) GetSummary(ctx context.Context, studentID uuid.UUID, classID uuid.UUID) (db.GetAttendanceSummaryByStudentRow, error) {
	return s.repo.GetSummaryByStudent(ctx, studentID, classID)
}
