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

// ErrNotAssignedToSubject is returned when a teacher tries to enter marks
// for a subject they aren't the assigned class-subject-teacher for.
var ErrNotAssignedToSubject = errors.New("you are not assigned to teach this subject for this class")

type TermMarkService struct {
	repo        *repositories.TermMarkRepository
	teacherRepo *repositories.TeacherRepository
	classRepo   *repositories.ClassRepository
}

func NewTermMarkService(repo *repositories.TermMarkRepository, teacherRepo *repositories.TeacherRepository, classRepo *repositories.ClassRepository) *TermMarkService {
	return &TermMarkService{repo: repo, teacherRepo: teacherRepo, classRepo: classRepo}
}

// authorizeTeacherForClassSubject ensures the acting user, if a teacher, is
// the class_subject_teachers-assigned teacher for this class+subject. Admins
// bypass the check entirely.
func (s *TermMarkService) authorizeTeacherForClassSubject(ctx context.Context, actor Actor, classID, subjectID uuid.UUID) error {
	if actor.Role == "admin" {
		return nil
	}

	teacher, err := s.teacherRepo.GetByUserID(ctx, actor.ID)
	if err != nil {
		return fmt.Errorf("only teachers assigned to a subject can enter its marks")
	}

	assignedTeacherID, err := s.classRepo.GetSubjectTeacher(ctx, classID, subjectID)
	if err != nil {
		return fmt.Errorf("no teacher is assigned to teach this subject for this class")
	}
	if assignedTeacherID != teacher.ID {
		return ErrNotAssignedToSubject
	}
	return nil
}

// BulkUpsertMarks records one mark per entry (typically a whole class's
// marks for one subject and term, entered from the marks-entry grid).
func (s *TermMarkService) BulkUpsertMarks(ctx context.Context, classID uuid.UUID, actor Actor, req models.BulkUpsertMarksRequest) ([]db.TermMark, error) {
	termID, err := uuid.Parse(req.TermID)
	if err != nil {
		return nil, err
	}
	subjectID, err := uuid.Parse(req.SubjectID)
	if err != nil {
		return nil, err
	}

	if err := s.authorizeTeacherForClassSubject(ctx, actor, classID, subjectID); err != nil {
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
			EnteredBy: pgtype.UUID{Bytes: actor.ID, Valid: true},
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
