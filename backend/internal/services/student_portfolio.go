package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

var (
	ErrInvalidActivityCategory     = errors.New("invalid activity category")
	ErrInvalidDisciplinarySeverity = errors.New("invalid severity")
	ErrPortfolioRecordNotFound     = errors.New("record not found")
)

type StudentPortfolioService struct {
	repo        *repositories.StudentPortfolioRepository
	teacherRepo *repositories.TeacherRepository
}

func NewStudentPortfolioService(repo *repositories.StudentPortfolioRepository, teacherRepo *repositories.TeacherRepository) *StudentPortfolioService {
	return &StudentPortfolioService{repo: repo, teacherRepo: teacherRepo}
}

// TeacherProfileIDForUser resolves the signed-in caller's teacher_profiles
// id (nil if they're not a teacher, e.g. an admin) — used to credit
// "written_by" on a progress report without exposing the teacher lookup to
// the handler layer.
func (s *StudentPortfolioService) TeacherProfileIDForUser(ctx context.Context, userID uuid.UUID) *uuid.UUID {
	teacher, err := s.teacherRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil
	}
	return &teacher.ID
}

// Progress reports

func (s *StudentPortfolioService) CreateProgressReport(ctx context.Context, studentID uuid.UUID, req models.CreateProgressReportRequest, writtenBy *uuid.UUID) (db.StudentProgressReport, error) {
	termID, err := uuid.Parse(req.TermID)
	if err != nil {
		return db.StudentProgressReport{}, fmt.Errorf("invalid term id")
	}
	return s.repo.CreateProgressReport(ctx, studentID, termID, req.Narrative, writtenBy)
}

func (s *StudentPortfolioService) ListProgressReports(ctx context.Context, studentID uuid.UUID) ([]db.ListProgressReportsByStudentRow, error) {
	return s.repo.ListProgressReports(ctx, studentID)
}

func (s *StudentPortfolioService) UpdateProgressReport(ctx context.Context, id, studentID uuid.UUID, req models.UpdateProgressReportRequest) (db.StudentProgressReport, error) {
	report, err := s.repo.UpdateProgressReport(ctx, id, studentID, req.Narrative)
	if errors.Is(err, pgx.ErrNoRows) {
		return db.StudentProgressReport{}, ErrPortfolioRecordNotFound
	}
	return report, err
}

func (s *StudentPortfolioService) DeleteProgressReport(ctx context.Context, id, studentID uuid.UUID) error {
	rows, err := s.repo.DeleteProgressReport(ctx, id, studentID)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrPortfolioRecordNotFound
	}
	return nil
}

// Activities

func (s *StudentPortfolioService) CreateActivity(ctx context.Context, studentID uuid.UUID, req models.CreateActivityRequest) (db.StudentActivity, error) {
	if !models.ValidActivityCategories[req.Category] {
		return db.StudentActivity{}, ErrInvalidActivityCategory
	}
	yearID, err := uuid.Parse(req.AcademicYearID)
	if err != nil {
		return db.StudentActivity{}, fmt.Errorf("invalid academic year id")
	}
	return s.repo.CreateActivity(ctx, studentID, yearID, req.Category, req.Name, req.Role, req.Achievement)
}

func (s *StudentPortfolioService) ListActivities(ctx context.Context, studentID uuid.UUID) ([]db.StudentActivity, error) {
	return s.repo.ListActivities(ctx, studentID)
}

func (s *StudentPortfolioService) UpdateActivity(ctx context.Context, id, studentID uuid.UUID, req models.UpdateActivityRequest) (db.StudentActivity, error) {
	if !models.ValidActivityCategories[req.Category] {
		return db.StudentActivity{}, ErrInvalidActivityCategory
	}
	activity, err := s.repo.UpdateActivity(ctx, id, studentID, req.Category, req.Name, req.Role, req.Achievement)
	if errors.Is(err, pgx.ErrNoRows) {
		return db.StudentActivity{}, ErrPortfolioRecordNotFound
	}
	return activity, err
}

func (s *StudentPortfolioService) DeleteActivity(ctx context.Context, id, studentID uuid.UUID) error {
	rows, err := s.repo.DeleteActivity(ctx, id, studentID)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrPortfolioRecordNotFound
	}
	return nil
}

// Leadership roles

func (s *StudentPortfolioService) CreateLeadershipRole(ctx context.Context, studentID uuid.UUID, req models.CreateLeadershipRoleRequest) (db.StudentLeadershipRole, error) {
	yearID, err := uuid.Parse(req.AcademicYearID)
	if err != nil {
		return db.StudentLeadershipRole{}, fmt.Errorf("invalid academic year id")
	}
	return s.repo.CreateLeadershipRole(ctx, studentID, yearID, req.Title, req.Scope)
}

func (s *StudentPortfolioService) ListLeadershipRoles(ctx context.Context, studentID uuid.UUID) ([]db.StudentLeadershipRole, error) {
	return s.repo.ListLeadershipRoles(ctx, studentID)
}

func (s *StudentPortfolioService) DeleteLeadershipRole(ctx context.Context, id, studentID uuid.UUID) error {
	rows, err := s.repo.DeleteLeadershipRole(ctx, id, studentID)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrPortfolioRecordNotFound
	}
	return nil
}

// Awards

func (s *StudentPortfolioService) CreateAward(ctx context.Context, studentID uuid.UUID, req models.CreateAwardRequest) (db.StudentAward, error) {
	yearID, err := uuid.Parse(req.AcademicYearID)
	if err != nil {
		return db.StudentAward{}, fmt.Errorf("invalid academic year id")
	}
	return s.repo.CreateAward(ctx, studentID, yearID, req.Title, req.Category, req.AwardedDate, req.Description)
}

func (s *StudentPortfolioService) ListAwards(ctx context.Context, studentID uuid.UUID) ([]db.StudentAward, error) {
	return s.repo.ListAwards(ctx, studentID)
}

func (s *StudentPortfolioService) DeleteAward(ctx context.Context, id, studentID uuid.UUID) error {
	rows, err := s.repo.DeleteAward(ctx, id, studentID)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrPortfolioRecordNotFound
	}
	return nil
}

// Disciplinary records

func (s *StudentPortfolioService) CreateDisciplinaryRecord(ctx context.Context, studentID uuid.UUID, req models.CreateDisciplinaryRecordRequest, recordedBy *uuid.UUID) (db.StudentDisciplinaryRecord, error) {
	if !models.ValidDisciplinarySeverities[req.Severity] {
		return db.StudentDisciplinaryRecord{}, ErrInvalidDisciplinarySeverity
	}
	yearID, err := uuid.Parse(req.AcademicYearID)
	if err != nil {
		return db.StudentDisciplinaryRecord{}, fmt.Errorf("invalid academic year id")
	}
	return s.repo.CreateDisciplinaryRecord(ctx, studentID, yearID, req.IncidentDate, req.Description, req.ActionTaken, req.Severity, recordedBy)
}

func (s *StudentPortfolioService) ListDisciplinaryRecords(ctx context.Context, studentID uuid.UUID) ([]db.StudentDisciplinaryRecord, error) {
	return s.repo.ListDisciplinaryRecords(ctx, studentID)
}

func (s *StudentPortfolioService) DeleteDisciplinaryRecord(ctx context.Context, id, studentID uuid.UUID) error {
	rows, err := s.repo.DeleteDisciplinaryRecord(ctx, id, studentID)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrPortfolioRecordNotFound
	}
	return nil
}
