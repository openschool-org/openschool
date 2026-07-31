package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

type TermMarkService struct {
	repo *repositories.TermMarkRepository
}

func NewTermMarkService(repo *repositories.TermMarkRepository) *TermMarkService {
	return &TermMarkService{repo: repo}
}

// BulkUpsertMarks records one mark per entry (typically a whole class's
// marks for one subject and term, entered from the marks-entry grid).
func (s *TermMarkService) BulkUpsertMarks(ctx context.Context, req models.BulkUpsertMarksRequest, enteredBy uuid.UUID) ([]db.TermMark, error) {
	termID, err := uuid.Parse(req.TermID)
	if err != nil {
		return nil, err
	}
	subjectID, err := uuid.Parse(req.SubjectID)
	if err != nil {
		return nil, err
	}

	results := make([]db.TermMark, 0, len(req.Entries))
	for _, entry := range req.Entries {
		studentID, err := uuid.Parse(entry.StudentID)
		if err != nil {
			return nil, err
		}

		maxMarks := entry.MaxMarks
		if maxMarks == 0 {
			maxMarks = 100
		}

		mark, err := s.repo.Upsert(ctx, db.UpsertTermMarkParams{
			StudentID: studentID,
			SubjectID: subjectID,
			TermID:    termID,
			Marks:     pgNumeric(entry.Marks),
			MaxMarks:  pgNumeric(maxMarks),
			EnteredBy: pgtype.UUID{Bytes: enteredBy, Valid: true},
		})
		if err != nil {
			return nil, err
		}
		results = append(results, mark)
	}

	return results, nil
}

func (s *TermMarkService) ListClassMarks(ctx context.Context, classID, termID, subjectID uuid.UUID) ([]db.ListClassMarksForTermSubjectRow, error) {
	return s.repo.ListClassMarksForTermSubject(ctx, db.ListClassMarksForTermSubjectParams{
		ClassID:   classID,
		TermID:    termID,
		SubjectID: subjectID,
	})
}

func (s *TermMarkService) ListStudentMarks(ctx context.Context, studentID, termID uuid.UUID) ([]db.ListStudentMarksByTermRow, error) {
	return s.repo.ListStudentMarksByTerm(ctx, db.ListStudentMarksByTermParams{
		StudentID: studentID,
		TermID:    termID,
	})
}

func (s *TermMarkService) DeleteMark(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}
