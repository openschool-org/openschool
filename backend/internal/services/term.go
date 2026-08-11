package services

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

var (
	ErrTermNotFound = errors.New("term not found")
	ErrTermInUse    = errors.New("term has marks recorded against it and cannot be deleted")
)

type TermService struct {
	repo *repositories.TermRepository
}

func NewTermService(repo *repositories.TermRepository) *TermService {
	return &TermService{repo: repo}
}

func (s *TermService) CreateTerm(ctx context.Context, req models.CreateTermRequest) (db.Term, error) {
	yearID, err := uuid.Parse(req.AcademicYearID)
	if err != nil {
		return db.Term{}, errors.New("invalid academic_year_id")
	}

	return s.repo.Create(ctx, db.CreateTermParams{
		AcademicYearID: yearID,
		Name:           req.Name,
		StartDate:      pgtype.Date{Time: req.StartDate, Valid: true},
		EndDate:        pgtype.Date{Time: req.EndDate, Valid: true},
		SortOrder:      int32(req.SortOrder),
	})
}

func (s *TermService) ListTermsByAcademicYear(ctx context.Context, academicYearID uuid.UUID) ([]db.Term, error) {
	return s.repo.ListByAcademicYear(ctx, academicYearID)
}

func (s *TermService) GetCurrentTerm(ctx context.Context) (db.Term, error) {
	return s.repo.GetCurrent(ctx)
}

func (s *TermService) SetCurrentTerm(ctx context.Context, id uuid.UUID) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return ErrTermNotFound
	}
	return s.repo.SetCurrent(ctx, id)
}

func (s *TermService) UpdateTerm(ctx context.Context, id uuid.UUID, req models.UpdateTermRequest) (db.Term, error) {
	return s.repo.Update(ctx, db.UpdateTermParams{
		ID:        id,
		Name:      req.Name,
		StartDate: pgtype.Date{Time: req.StartDate, Valid: true},
		EndDate:   pgtype.Date{Time: req.EndDate, Valid: true},
		SortOrder: int32(req.SortOrder),
	})
}

func (s *TermService) DeleteTerm(ctx context.Context, id uuid.UUID) error {
	rows, err := s.repo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		if _, err := s.repo.GetByID(ctx, id); err != nil {
			return ErrTermNotFound
		}
		return ErrTermInUse
	}
	return nil
}
