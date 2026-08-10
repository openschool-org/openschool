package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

var ErrPrefectNotFound = errors.New("prefect assignment not found")

type PrefectService struct {
	repo *repositories.PrefectRepository
}

func NewPrefectService(repo *repositories.PrefectRepository) *PrefectService {
	return &PrefectService{repo: repo}
}

func (s *PrefectService) Assign(ctx context.Context, req models.AssignPrefectRequest) (db.Prefect, error) {
	yearID, err := uuid.Parse(req.AcademicYearID)
	if err != nil {
		return db.Prefect{}, fmt.Errorf("invalid academic year id")
	}
	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		return db.Prefect{}, fmt.Errorf("invalid student id")
	}

	return s.repo.Upsert(ctx, db.UpsertPrefectParams{
		AcademicYearID: yearID,
		StudentID:      studentID,
		Rank:           req.Rank,
	})
}

func (s *PrefectService) ListByYear(ctx context.Context, academicYearID uuid.UUID) ([]db.ListPrefectsByYearRow, error) {
	return s.repo.ListByYear(ctx, academicYearID)
}

func (s *PrefectService) ListByStudent(ctx context.Context, studentID uuid.UUID) ([]db.ListPrefectAppointmentsByStudentRow, error) {
	return s.repo.ListByStudent(ctx, studentID)
}

func (s *PrefectService) ListYears(ctx context.Context) ([]db.ListPrefectYearsRow, error) {
	return s.repo.ListYears(ctx)
}

func (s *PrefectService) Delete(ctx context.Context, id uuid.UUID) error {
	n, err := s.repo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrPrefectNotFound
	}
	return nil
}
