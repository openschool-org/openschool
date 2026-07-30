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

var ErrSectionHeadNotFound = errors.New("section head assignment not found")

type SectionHeadService struct {
	repo *repositories.SectionHeadRepository
}

func NewSectionHeadService(repo *repositories.SectionHeadRepository) *SectionHeadService {
	return &SectionHeadService{repo: repo}
}

func (s *SectionHeadService) Assign(ctx context.Context, req models.AssignSectionHeadRequest) (db.SectionHead, error) {
	yearID, err := uuid.Parse(req.AcademicYearID)
	if err != nil {
		return db.SectionHead{}, fmt.Errorf("invalid academic year id")
	}
	gradeID, err := uuid.Parse(req.GradeID)
	if err != nil {
		return db.SectionHead{}, fmt.Errorf("invalid grade id")
	}
	teacherID, err := uuid.Parse(req.TeacherID)
	if err != nil {
		return db.SectionHead{}, fmt.Errorf("invalid teacher id")
	}

	if req.StreamID != nil && *req.StreamID != "" {
		streamID, err := uuid.Parse(*req.StreamID)
		if err != nil {
			return db.SectionHead{}, fmt.Errorf("invalid stream id")
		}
		return s.repo.UpsertStream(ctx, db.UpsertStreamSectionHeadParams{
			AcademicYearID: yearID,
			GradeID:        gradeID,
			StreamID:       pgtype.UUID{Bytes: streamID, Valid: true},
			TeacherID:      teacherID,
		})
	}

	return s.repo.UpsertGrade(ctx, db.UpsertGradeSectionHeadParams{
		AcademicYearID: yearID,
		GradeID:        gradeID,
		TeacherID:      teacherID,
	})
}

func (s *SectionHeadService) ListByYear(ctx context.Context, academicYearID uuid.UUID) ([]db.ListSectionHeadsByYearRow, error) {
	return s.repo.ListByYear(ctx, academicYearID)
}

func (s *SectionHeadService) Delete(ctx context.Context, id uuid.UUID) error {
	n, err := s.repo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrSectionHeadNotFound
	}
	return nil
}
