package services

import (
	"context"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

type GradeSubjectService struct {
	repo *repositories.GradeSubjectRepository
}

func NewGradeSubjectService(repo *repositories.GradeSubjectRepository) *GradeSubjectService {
	return &GradeSubjectService{repo: repo}
}

func (s *GradeSubjectService) AssignSubject(ctx context.Context, gradeID uuid.UUID, req models.AssignSubjectToGradeRequest) error {
	subjectID, err := uuid.Parse(req.SubjectID)
	if err != nil {
		return err
	}
	return s.repo.AssignSubject(ctx, db.AssignSubjectToGradeParams{
		GradeID:   gradeID,
		SubjectID: subjectID,
	})
}

func (s *GradeSubjectService) RemoveSubject(ctx context.Context, gradeID, subjectID uuid.UUID) error {
	return s.repo.RemoveSubject(ctx, db.RemoveSubjectFromGradeParams{
		GradeID:   gradeID,
		SubjectID: subjectID,
	})
}

func (s *GradeSubjectService) ListSubjectsByGrade(ctx context.Context, gradeID uuid.UUID) ([]db.Subject, error) {
	return s.repo.ListByGrade(ctx, gradeID)
}

func (s *GradeSubjectService) CreateBucket(ctx context.Context, gradeID uuid.UUID, req models.CreateSubjectBucketRequest) (db.SubjectBucket, error) {
	return s.repo.CreateBucket(ctx, db.CreateSubjectBucketParams{
		GradeID: gradeID,
		Name:    req.Name,
	})
}

func (s *GradeSubjectService) ListBucketsByGrade(ctx context.Context, gradeID uuid.UUID) ([]db.SubjectBucket, error) {
	return s.repo.ListBucketsByGrade(ctx, gradeID)
}

func (s *GradeSubjectService) AddSubjectToBucket(ctx context.Context, bucketID uuid.UUID, req models.AddSubjectToBucketRequest) error {
	subjectID, err := uuid.Parse(req.SubjectID)
	if err != nil {
		return err
	}
	return s.repo.AddSubjectToBucket(ctx, db.AddSubjectToBucketParams{
		BucketID:  bucketID,
		SubjectID: subjectID,
	})
}

func (s *GradeSubjectService) ListBucketOptions(ctx context.Context, bucketID uuid.UUID) ([]db.Subject, error) {
	return s.repo.ListBucketOptions(ctx, bucketID)
}
