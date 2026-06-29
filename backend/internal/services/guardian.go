package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

type GuardianService struct {
	repo *repositories.GuardianRepository
}

func NewGuardianService(repo *repositories.GuardianRepository) *GuardianService {
	return &GuardianService{repo: repo}
}

func (s *GuardianService) CreateGuardian(ctx context.Context, req models.CreateGuardianRequest) (db.Guardian, error) {
	return s.repo.CreateWithNullable(ctx, req.FullName, req.Relationship, req.Phone, req.Email)
}

func (s *GuardianService) GetGuardian(ctx context.Context, id uuid.UUID) (db.Guardian, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *GuardianService) UpdateGuardian(ctx context.Context, id uuid.UUID, req models.UpdateGuardianRequest) (db.Guardian, error) {
	return s.repo.UpdateWithNullable(ctx, id, req.FullName, req.Relationship, req.Phone, req.Email)
}

func (s *GuardianService) LinkToStudent(ctx context.Context, studentID uuid.UUID, req models.LinkGuardianRequest) error {
	guardianID, err := uuid.Parse(req.GuardianID)
	if err != nil {
		return fmt.Errorf("invalid guardian id")
	}
	return s.repo.LinkToStudent(ctx, studentID, guardianID, req.IsPrimaryContact)
}

func (s *GuardianService) UnlinkFromStudent(ctx context.Context, studentID uuid.UUID, guardianID uuid.UUID) error {
	return s.repo.UnlinkFromStudent(ctx, studentID, guardianID)
}

func (s *GuardianService) SetPrimaryContact(ctx context.Context, studentID uuid.UUID, guardianID uuid.UUID) error {
	return s.repo.SetPrimaryContact(ctx, studentID, guardianID)
}

func (s *GuardianService) ListByStudent(ctx context.Context, studentID uuid.UUID) ([]db.ListGuardiansByStudentRow, error) {
	return s.repo.ListByStudent(ctx, studentID)
}
