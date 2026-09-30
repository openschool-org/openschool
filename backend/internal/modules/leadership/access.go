package leadership

import (
	"context"
	"errors"
	"slices"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// classAccess is what deciding a teacher's access to one class needs.
type classAccess struct {
	TeacherID, GradeID, AcademicYearID uuid.UUID
	Assigned                           bool
}

// CanAccessClass reports whether the user teaches the class or leads its grade. Admins are checked by the caller.
func (s *Service) CanAccessClass(ctx context.Context, userID, classID uuid.UUID) (bool, error) {
	access, err := s.store.teacherClassAccess(ctx, userID, classID)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil || access.Assigned {
		return access.Assigned, err
	}
	wholeSchool, gradeIDs, err := s.LeadershipScope(ctx, access.TeacherID, access.AcademicYearID)
	if errors.Is(err, ErrInsufficientRank) {
		return false, nil
	}
	return wholeSchool || slices.Contains(gradeIDs, access.GradeID), err
}

// CanAccessStudent applies CanAccessClass to the student's current class.
func (s *Service) CanAccessStudent(ctx context.Context, userID, studentID uuid.UUID) (bool, error) {
	classID, err := s.store.currentClassOfStudent(ctx, studentID)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return s.CanAccessClass(ctx, userID, classID)
}
