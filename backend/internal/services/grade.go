package services

import (
	"context"
	"errors"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

var (
	ErrGradeNotFound = errors.New("grade not found")
	ErrGradeInUse    = errors.New("grade is used by a class or curriculum level and cannot be deleted")
)

type GradeService struct {
	repo *repositories.GradeRepository
}

func NewGradeService(repo *repositories.GradeRepository) *GradeService {
	return &GradeService{repo: repo}
}

func (s *GradeService) CreateGrade(ctx context.Context, req models.CreateGradeRequest) (db.Grade, error) {
	return s.repo.Create(ctx, db.CreateGradeParams{
		Name:      req.Name,
		SortOrder: int32(req.SortOrder),
	})
}

func (s *GradeService) GetGrade(ctx context.Context, id uuid.UUID) (db.Grade, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *GradeService) ListGrades(ctx context.Context) ([]db.Grade, error) {
	return s.repo.List(ctx)
}

func (s *GradeService) UpdateGrade(ctx context.Context, id uuid.UUID, req models.UpdateGradeRequest) (db.Grade, error) {
	return s.repo.Update(ctx, db.UpdateGradeParams{
		ID:        id,
		Name:      req.Name,
		SortOrder: int32(req.SortOrder),
	})
}

func (s *GradeService) DeleteGrade(ctx context.Context, id uuid.UUID) error {
	rows, err := s.repo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		if _, err := s.repo.GetByID(ctx, id); err != nil {
			return ErrGradeNotFound
		}
		return ErrGradeInUse
	}
	return nil
}
