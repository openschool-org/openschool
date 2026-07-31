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

// ErrNotAssignedToClass is returned when a teacher tries to create a
// session or mark attendance for a class they aren't the form teacher of,
// or don't teach any subject in.
var ErrNotAssignedToClass = errors.New("you are not assigned to teach this class")

type AttendanceService struct {
	repo        *repositories.AttendanceRepository
	userRepo    *repositories.UserRepository
	teacherRepo *repositories.TeacherRepository
	classRepo   *repositories.ClassRepository
}

func NewAttendanceService(repo *repositories.AttendanceRepository, userRepo *repositories.UserRepository, teacherRepo *repositories.TeacherRepository, classRepo *repositories.ClassRepository) *AttendanceService {
	return &AttendanceService{repo: repo, userRepo: userRepo, teacherRepo: teacherRepo, classRepo: classRepo}
}

// authorizeTeacherForClass ensures the acting user, if a teacher, is the
// class's form teacher or teaches at least one subject in it. Admins bypass
// the check entirely.
func (s *AttendanceService) authorizeTeacherForClass(ctx context.Context, actor Actor, classID uuid.UUID) error {
	if actor.Role == "admin" {
		return nil
	}

	teacher, err := s.teacherRepo.GetByUserID(ctx, actor.ID)
	if err != nil {
		return fmt.Errorf("only teachers assigned to a class can record its attendance")
	}

	assigned, err := s.classRepo.IsTeacherAssignedToClass(ctx, classID, teacher.ID)
	if err != nil {
		return err
	}
	if !assigned {
		return ErrNotAssignedToClass
	}
	return nil
}

// authenticated user creating the session (taken from jwt)
type Actor struct {
	ID       uuid.UUID
	Email    string
	FullName string
	Role     string
}

func (s *AttendanceService) CreateSession(ctx context.Context, actor Actor, req models.CreateAttendanceSessionRequest) (db.AttendanceSession, error) {
	classID, err := uuid.Parse(req.ClassID)
	if err != nil {
		return db.AttendanceSession{}, fmt.Errorf("invalid class id")
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return db.AttendanceSession{}, fmt.Errorf("invalid date format, use YYYY-MM-DD")
	}

	if err := s.authorizeTeacherForClass(ctx, actor, classID); err != nil {
		return db.AttendanceSession{}, err
	}

	takenBy, err := s.resolveActingUser(ctx, actor)
	if err != nil {
		return db.AttendanceSession{}, err
	}

	_, err = s.repo.GetSessionByClassAndDate(ctx, classID, date)
	if err == nil {
		return db.AttendanceSession{}, fmt.Errorf("attendance session already exists for this class on this date")
	}

	return s.repo.CreateSession(ctx, classID, takenBy, date)
}

func (s *AttendanceService) resolveActingUser(ctx context.Context, actor Actor) (uuid.UUID, error) {
	if _, err := s.userRepo.GetByID(ctx, actor.ID); err == nil {
		return actor.ID, nil
	}

	if actor.Role == "" {
		return uuid.UUID{}, fmt.Errorf("cannot record attendance: signed-in user has no recognized role")
	}

	if existing, err := s.userRepo.GetByEmail(ctx, actor.Email); err == nil {
		return existing.ID, nil
	}

	fullName := actor.FullName
	if fullName == "" {
		fullName = actor.Email
	}

	created, err := s.userRepo.Create(ctx, db.CreateUserParams{
		ID:       actor.ID,
		Email:    actor.Email,
		FullName: fullName,
		Role:     actor.Role,
	})
	if err != nil {
		return uuid.UUID{}, fmt.Errorf("failed to provision acting user: %w", err)
	}

	return created.ID, nil
}

func (s *AttendanceService) GetSession(ctx context.Context, id uuid.UUID) (db.AttendanceSession, error) {
	return s.repo.GetSessionByID(ctx, id)
}

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

func (s *AttendanceService) MarkAttendance(ctx context.Context, actor Actor, sessionID uuid.UUID, req models.MarkAttendanceRequest) error {
	session, err := s.repo.GetSessionByID(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("attendance session not found")
	}

	if err := s.authorizeTeacherForClass(ctx, actor, session.ClassID); err != nil {
		return err
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
