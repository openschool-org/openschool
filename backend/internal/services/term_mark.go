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

func (s *TermMarkService) ListClassMarks(ctx context.Context, actor Actor, classID, termID, subjectID uuid.UUID) ([]db.ListClassMarksForTermSubjectRow, error) {
	if err := s.authorizeTeacherForClassSubject(ctx, actor, classID, subjectID); err != nil {
		return nil, err
	}
	return s.repo.ListClassMarksForTermSubject(ctx, db.ListClassMarksForTermSubjectParams{
		ClassID:   classID,
		TermID:    termID,
		SubjectID: subjectID,
	})
}

// authorizeTeacherForStudentMarks ensures the acting user, if a teacher,
// teaches at least one subject in the class the student is currently
// enrolled in. Marks span every subject for a term (not just one), so this
// is a class-level check rather than authorizeTeacherForClassSubject's
// subject-specific one.
func (s *TermMarkService) authorizeTeacherForStudentMarks(ctx context.Context, actor Actor, studentID uuid.UUID) error {
	if actor.Role == "admin" {
		return nil
	}
	class, err := s.classRepo.GetStudentCurrentClass(ctx, studentID)
	if err != nil {
		return ErrNotAssignedToSubject
	}
	teacher, err := s.teacherRepo.GetByUserID(ctx, actor.ID)
	if err != nil {
		return fmt.Errorf("only teachers assigned to a class can view its marks")
	}
	assigned, err := s.classRepo.IsTeacherAssignedToClass(ctx, class.ID, teacher.ID)
	if err != nil {
		return err
	}
	if !assigned {
		return ErrNotAssignedToSubject
	}
	return nil
}

// ListStudentMarks is for contexts that have already verified the caller
// may see this student's marks by some other means (a student viewing
// their own via /me/student/marks, a parent viewing their own linked child
// via /me/children/:id/marks). For the teacher/admin-facing
// /students/:id/marks route, use ListStudentMarksForTeacher instead.
func (s *TermMarkService) ListStudentMarks(ctx context.Context, studentID, termID uuid.UUID) ([]db.ListStudentMarksByTermRow, error) {
	return s.repo.ListStudentMarksByTerm(ctx, db.ListStudentMarksByTermParams{
		StudentID: studentID,
		TermID:    termID,
	})
}

func (s *TermMarkService) ListStudentMarksForTeacher(ctx context.Context, actor Actor, studentID, termID uuid.UUID) ([]db.ListStudentMarksByTermRow, error) {
	if err := s.authorizeTeacherForStudentMarks(ctx, actor, studentID); err != nil {
		return nil, err
	}
	return s.repo.ListStudentMarksByTerm(ctx, db.ListStudentMarksByTermParams{
		StudentID: studentID,
		TermID:    termID,
	})
}

func (s *TermMarkService) DeleteMark(ctx context.Context, actor Actor, id uuid.UUID) error {
	mark, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("mark not found")
	}
	class, err := s.classRepo.GetStudentCurrentClass(ctx, mark.StudentID)
	if err != nil {
		if actor.Role != "admin" {
			return ErrNotAssignedToSubject
		}
	} else if err := s.authorizeTeacherForClassSubject(ctx, actor, class.ID, mark.SubjectID); err != nil {
		return err
	}
	return s.repo.Delete(ctx, id)
}
