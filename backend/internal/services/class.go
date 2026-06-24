package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

type ClassService struct {
	repo *repositories.ClassRepository
}

func NewClassService(repo *repositories.ClassRepository) *ClassService {
	return &ClassService{repo: repo}
}

func (s *ClassService) CreateClass(ctx context.Context, req models.CreateClassRequest) (db.Class, error) {
	params := db.CreateClassParams{
		GradeID:        req.GradeID,
		AcademicYearID: req.AcademicYearID,
		Name:           req.Name,
	}

	if req.FormTeacherID != nil {
		params.FormTeacherID = pgtype.UUID{Bytes: *req.FormTeacherID, Valid: true}
	}
	if req.StreamID != nil {
		params.StreamID = pgtype.UUID{Bytes: *req.StreamID, Valid: true}
	}
	if req.StreamGroupID != nil {
		params.StreamGroupID = pgtype.UUID{Bytes: *req.StreamGroupID, Valid: true}
	}

	return s.repo.Create(ctx, params)
}

func (s *ClassService) GetClass(ctx context.Context, id uuid.UUID) (db.Class, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *ClassService) ListByAcademicYear(ctx context.Context, academicYearID uuid.UUID) ([]db.ListClassesByAcademicYearRow, error) {
	return s.repo.ListByAcademicYear(ctx, academicYearID)
}

func (s *ClassService) ListCurrentClasses(ctx context.Context) ([]db.ListCurrentClassesRow, error) {
	return s.repo.ListCurrent(ctx)
}

func (s *ClassService) UpdateClass(ctx context.Context, id uuid.UUID, req models.UpdateClassRequest) (db.Class, error) {
	params := db.UpdateClassParams{
		ID:   id,
		Name: req.Name,
	}

	if req.FormTeacherID != nil {
		params.FormTeacherID = pgtype.UUID{Bytes: *req.FormTeacherID, Valid: true}
	}

	return s.repo.Update(ctx, params)
}

func (s *ClassService) DeleteClass(ctx context.Context, id uuid.UUID) error {
	count, err := s.repo.GetStudentCount(ctx, id)
	if err != nil {
		return err
	}
	if count > 0 {
		return fmt.Errorf("cannot delete class with %d enrolled students", count)
	}
	return s.repo.Delete(ctx, id)
}

func (s *ClassService) AssignFormTeacher(ctx context.Context, classID uuid.UUID, req models.AssignFormTeacherRequest) (db.Class, error) {
	return s.repo.AssignFormTeacher(ctx, classID, req.TeacherID)
}

func (s *ClassService) AssignSubjectTeacher(ctx context.Context, classID uuid.UUID, req models.AssignSubjectTeacherRequest) error {
	return s.repo.AssignSubjectTeacher(ctx, db.AssignSubjectTeacherToClassParams{
		ClassID:   classID,
		SubjectID: req.SubjectID,
		TeacherID: req.TeacherID,
	})
}

func (s *ClassService) ListSubjectTeachers(ctx context.Context, classID uuid.UUID) ([]db.ListSubjectTeachersByClassRow, error) {
	return s.repo.ListSubjectTeachers(ctx, classID)
}
