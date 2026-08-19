package timetable

import (
	"context"
	"errors"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	models "github.com/openschool-org/openschool/internal/models/timetable"
	repositories "github.com/openschool-org/openschool/internal/repositories/timetable"
)

var ErrLabPeriodsExceedTotal = errors.New("lab periods per week cannot exceed periods per week")
var ErrDoublePeriodBlocksExceedTotal = errors.New("double period blocks cannot need more periods than periods per week")

type SubjectPeriodRequirementService struct {
	repo *repositories.SubjectPeriodRequirementRepository
}

func NewSubjectPeriodRequirementService(repo *repositories.SubjectPeriodRequirementRepository) *SubjectPeriodRequirementService {
	return &SubjectPeriodRequirementService{repo: repo}
}

func (s *SubjectPeriodRequirementService) Upsert(ctx context.Context, req models.UpsertSubjectPeriodRequirementRequest) (db.SubjectPeriodRequirement, error) {
	if req.LabPeriodsPerWeek > req.PeriodsPerWeek {
		return db.SubjectPeriodRequirement{}, ErrLabPeriodsExceedTotal
	}
	if req.DoublePeriodBlocks*2 > req.PeriodsPerWeek {
		return db.SubjectPeriodRequirement{}, ErrDoublePeriodBlocksExceedTotal
	}
	return s.repo.Upsert(ctx, db.UpsertSubjectPeriodRequirementParams{
		AcademicYearID:     req.AcademicYearID,
		GradeID:            req.GradeID,
		SubjectID:          req.SubjectID,
		PeriodsPerWeek:     req.PeriodsPerWeek,
		LabPeriodsPerWeek:  req.LabPeriodsPerWeek,
		DoublePeriodBlocks: req.DoublePeriodBlocks,
	})
}

func (s *SubjectPeriodRequirementService) ListByGrade(ctx context.Context, academicYearID, gradeID uuid.UUID) ([]db.ListSubjectPeriodRequirementsByGradeRow, error) {
	return s.repo.ListByGrade(ctx, academicYearID, gradeID)
}

func (s *SubjectPeriodRequirementService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}
