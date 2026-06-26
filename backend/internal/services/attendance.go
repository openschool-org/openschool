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
}

func NewAttendanceService(repo *repositories.AttendanceRepository, teacherRepo *repositories.TeacherRepository) *AttendanceService {
	return &AttendanceService{repo: repo, teacherRepo: teacherRepo}
}

func (s *AttendanceService) CreateSession(ctx context.Context, userID uuid.UUID, req models.CreateAttendanceSessionRequest) (db.AttendanceSession, error) {
	classID, err := uuid.Parse(req.ClassID)
	if err != nil {
		return db.AttendanceSession{}, fmt.Errorf("invalid class id")
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return db.AttendanceSession{}, fmt.Errorf("invalid date format, use YYYY-MM-DD")
	}

	// look up teacher profile from user ID
	teacher, err := s.teacherRepo.GetByUserID(ctx, userID)
	if err != nil {
		return db.AttendanceSession{}, fmt.Errorf("only teachers can create attendance sessions")
	}

	// check session doesn't already exist
	_, err = s.repo.GetSessionByClassAndDate(ctx, classID, date)
	if err == nil {
		return db.AttendanceSession{}, fmt.Errorf("attendance session already exists for this class on this date")
	}

	return s.repo.CreateSession(ctx, classID, teacher.ID, date)
}
func (s *AttendanceService) GetSession(ctx context.Context, id uuid.UUID) (db.AttendanceSession, error) {
	return s.repo.GetSessionByID(ctx, id)
}

func (s *AttendanceService) ListSessionsByClass(ctx context.Context, classID uuid.UUID) ([]db.AttendanceSession, error) {
	return s.repo.ListSessionsByClass(ctx, classID)
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
