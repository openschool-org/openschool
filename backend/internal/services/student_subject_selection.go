package services

import (
	"context"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

type StudentSubjectSelectionService struct {
	repo *repositories.StudentSubjectSelectionRepository
}

func NewStudentSubjectSelectionService(repo *repositories.StudentSubjectSelectionRepository) *StudentSubjectSelectionService {
	return &StudentSubjectSelectionService{repo: repo}
}

func (s *StudentSubjectSelectionService) Upsert(ctx context.Context, studentID uuid.UUID, req models.UpsertStudentSubjectSelectionRequest) (db.StudentSubjectSelection, error) {
	bucketID, err := uuid.Parse(req.BucketID)
	if err != nil {
		return db.StudentSubjectSelection{}, err
	}
	subjectID, err := uuid.Parse(req.SubjectID)
	if err != nil {
		return db.StudentSubjectSelection{}, err
	}
	return s.repo.Upsert(ctx, db.CreateStudentSubjectSelectionParams{
		StudentID: studentID,
		BucketID:  bucketID,
		SubjectID: subjectID,
	})
}

func (s *StudentSubjectSelectionService) List(ctx context.Context, studentID uuid.UUID) ([]models.StudentSubjectSelectionResponse, error) {
	rows, err := s.repo.List(ctx, studentID)
	if err != nil {
		return nil, err
	}
	resp := make([]models.StudentSubjectSelectionResponse, len(rows))
	for i, r := range rows {
		resp[i] = models.StudentSubjectSelectionResponse{
			BucketID:    r.BucketID.String(),
			BucketName:  r.BucketName,
			SubjectID:   r.SubjectID.String(),
			SubjectName: r.SubjectName,
			SubjectCode: r.SubjectCode,
		}
	}
	return resp, nil
}

func (s *StudentSubjectSelectionService) Delete(ctx context.Context, studentID, bucketID uuid.UUID) error {
	return s.repo.Delete(ctx, db.DeleteStudentSubjectSelectionParams{
		StudentID: studentID,
		BucketID:  bucketID,
	})
}
