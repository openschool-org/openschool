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
	ErrSubjectNotFound = errors.New("subject not found")
	ErrSubjectInUse    = errors.New("subject is in use and cannot be deleted")
)

type SubjectService struct {
	repo *repositories.SubjectRepository
}

func NewSubjectService(repo *repositories.SubjectRepository) *SubjectService {
	return &SubjectService{repo: repo}
}

func (s *SubjectService) CreateSubject(ctx context.Context, req models.CreateSubjectRequest) (db.Subject, error) {
	return s.repo.Create(ctx, db.CreateSubjectParams{
		Name: req.Name,
		Code: req.Code,
		Type: optionalText(req.Type),
	})
}

func (s *SubjectService) GetSubject(ctx context.Context, id uuid.UUID) (db.Subject, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *SubjectService) ListSubjects(ctx context.Context) ([]db.Subject, error) {
	return s.repo.List(ctx)
}

func (s *SubjectService) UpdateSubject(ctx context.Context, id uuid.UUID, req models.UpdateSubjectRequest) (db.Subject, error) {
	return s.repo.Update(ctx, db.UpdateSubjectParams{
		ID:   id,
		Name: req.Name,
		Code: req.Code,
		Type: optionalText(req.Type),
	})
}

func (s *SubjectService) DeleteSubject(ctx context.Context, id uuid.UUID) error {
	rows, err := s.repo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		if _, err := s.repo.GetByID(ctx, id); err != nil {
			return ErrSubjectNotFound
		}
		return ErrSubjectInUse
	}
	return nil
}
