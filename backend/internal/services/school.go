package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

var (
	ErrAcademicYearNotFound = errors.New("academic year not found")
	ErrAcademicYearInUse    = errors.New("academic year is used by a class and cannot be deleted")
)

type SchoolService struct {
	repo *repositories.SchoolRepository
}

func NewSchoolService(repo *repositories.SchoolRepository) *SchoolService {
	return &SchoolService{repo: repo}
}

func (s *SchoolService) CreateSchool(ctx context.Context, req models.CreateSchoolRequest) (db.School, error) {
	// only one school should exist
	existing, err := s.repo.Get(ctx)
	if err == nil && existing.ID != (uuid.UUID{}) {
		return db.School{}, fmt.Errorf("school already exists")
	}

	return s.repo.Create(ctx, db.CreateSchoolParams{
		Name:      req.Name,
		Address:   pgtype.Text{String: req.Address, Valid: req.Address != ""},
		Phone:     pgtype.Text{String: req.Phone, Valid: req.Phone != ""},
		Email:     pgtype.Text{String: req.Email, Valid: req.Email != ""},
		LogoUrl:   pgtype.Text{String: req.LogoURL, Valid: req.LogoURL != ""},
		GradeFrom: optionalInt4(req.GradeFrom),
		GradeTo:   optionalInt4(req.GradeTo),
	})
}

func (s *SchoolService) GetSchool(ctx context.Context) (db.School, error) {
	return s.repo.Get(ctx)
}

func (s *SchoolService) UpdateSchool(ctx context.Context, id uuid.UUID, req models.UpdateSchoolRequest) (db.School, error) {
	return s.repo.Update(ctx, db.UpdateSchoolParams{
		ID:        id,
		Name:      req.Name,
		Address:   pgtype.Text{String: req.Address, Valid: req.Address != ""},
		Phone:     pgtype.Text{String: req.Phone, Valid: req.Phone != ""},
		Email:     pgtype.Text{String: req.Email, Valid: req.Email != ""},
		LogoUrl:   pgtype.Text{String: req.LogoURL, Valid: req.LogoURL != ""},
		GradeFrom: optionalInt4(req.GradeFrom),
		GradeTo:   optionalInt4(req.GradeTo),
	})
}

func (s *SchoolService) CreateAcademicYear(ctx context.Context, req models.CreateAcademicYearRequest) (db.AcademicYear, error) {
	return s.repo.CreateAcademicYear(ctx, db.CreateAcademicYearParams{
		Label:     req.Label,
		StartDate: pgtype.Date{Time: req.StartDate, Valid: true},
		EndDate:   pgtype.Date{Time: req.EndDate, Valid: true},
		IsCurrent: req.IsCurrent,
	})
}

func (s *SchoolService) GetCurrentAcademicYear(ctx context.Context) (db.AcademicYear, error) {
	return s.repo.GetCurrentAcademicYear(ctx)
}

func (s *SchoolService) ListAcademicYears(ctx context.Context) ([]db.AcademicYear, error) {
	return s.repo.ListAcademicYears(ctx)
}

func (s *SchoolService) SetCurrentAcademicYear(ctx context.Context, id uuid.UUID) error {
	if _, err := s.repo.GetAcademicYearByID(ctx, id); err != nil {
		return ErrAcademicYearNotFound
	}
	return s.repo.SetCurrentAcademicYear(ctx, id)
}

func (s *SchoolService) DeleteAcademicYear(ctx context.Context, id uuid.UUID) error {
	rows, err := s.repo.DeleteAcademicYear(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		if _, err := s.repo.GetAcademicYearByID(ctx, id); err != nil {
			return ErrAcademicYearNotFound
		}
		return ErrAcademicYearInUse
	}
	return nil
}
