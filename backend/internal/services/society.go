package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

var (
	ErrSocietyNotFound       = errors.New("society not found")
	ErrSocietyMemberNotFound = errors.New("society membership not found")
	// ErrNotTeacherInCharge mirrors ErrNotAssignedToClass (attendance.go) —
	// a teacher below admin trying to manage a society they don't lead.
	ErrNotTeacherInCharge = errors.New("only the society's Teacher-in-Charge can manage its roster")
)

type SocietyService struct {
	repo        *repositories.SocietyRepository
	teacherRepo *repositories.TeacherRepository
}

func NewSocietyService(repo *repositories.SocietyRepository, teacherRepo *repositories.TeacherRepository) *SocietyService {
	return &SocietyService{repo: repo, teacherRepo: teacherRepo}
}

func (s *SocietyService) Create(ctx context.Context, req models.CreateSocietyRequest) (db.Society, error) {
	teacherID, err := uuid.Parse(req.TeacherInChargeID)
	if err != nil {
		return db.Society{}, fmt.Errorf("invalid teacher_in_charge_id")
	}
	yearID, err := uuid.Parse(req.AcademicYearID)
	if err != nil {
		return db.Society{}, fmt.Errorf("invalid academic_year_id")
	}

	return s.repo.Create(ctx, db.CreateSocietyParams{
		Name:              req.Name,
		TeacherInChargeID: teacherID,
		AcademicYearID:    yearID,
	})
}

func (s *SocietyService) Update(ctx context.Context, id uuid.UUID, req models.UpdateSocietyRequest) (db.Society, error) {
	teacherID, err := uuid.Parse(req.TeacherInChargeID)
	if err != nil {
		return db.Society{}, fmt.Errorf("invalid teacher_in_charge_id")
	}

	return s.repo.Update(ctx, db.UpdateSocietyParams{
		ID:                id,
		Name:              req.Name,
		TeacherInChargeID: teacherID,
	})
}

func (s *SocietyService) Delete(ctx context.Context, id uuid.UUID) error {
	n, err := s.repo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrSocietyNotFound
	}
	return nil
}

func (s *SocietyService) ListByYear(ctx context.Context, academicYearID uuid.UUID) ([]db.ListSocietiesByYearRow, error) {
	return s.repo.ListByYear(ctx, academicYearID)
}

func (s *SocietyService) ListYears(ctx context.Context) ([]db.ListSocietyYearsRow, error) {
	return s.repo.ListYears(ctx)
}

// GetForTeacher resolves the "My Society" page for a signed-in teacher.
func (s *SocietyService) GetForTeacher(ctx context.Context, teacherID, academicYearID uuid.UUID) (db.Society, error) {
	society, err := s.repo.GetForTeacher(ctx, teacherID, academicYearID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return db.Society{}, ErrSocietyNotFound
		}
		return db.Society{}, err
	}
	return society, nil
}

func (s *SocietyService) ListMembers(ctx context.Context, societyID uuid.UUID) ([]db.ListSocietyMembersBySocietyRow, error) {
	return s.repo.ListMembersBySociety(ctx, societyID)
}

func (s *SocietyService) ListMembershipsByStudent(ctx context.Context, studentID uuid.UUID) ([]db.ListSocietyMembershipsByStudentRow, error) {
	return s.repo.ListMembershipsByStudent(ctx, studentID)
}

// authorizeTeacherInCharge mirrors AttendanceService.authorizeTeacherForClass
// (attendance.go): admins bypass, a teacher must be the TIC of the society
// they're trying to modify the roster of. Returns the society itself so
// callers can use its authoritative academic_year_id instead of trusting
// one supplied by the request.
func (s *SocietyService) authorizeTeacherInCharge(ctx context.Context, actor Actor, societyID uuid.UUID) (db.Society, error) {
	society, err := s.repo.GetByID(ctx, societyID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return db.Society{}, ErrSocietyNotFound
		}
		return db.Society{}, err
	}

	if actor.Role == models.RoleAdmin {
		return society, nil
	}

	teacher, err := s.teacherRepo.GetByUserID(ctx, actor.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return db.Society{}, ErrNotTeacherInCharge
		}
		return db.Society{}, err
	}
	if society.TeacherInChargeID != teacher.ID {
		return db.Society{}, ErrNotTeacherInCharge
	}
	return society, nil
}

// AssignMember appoints (or re-appoints) a student to a society's roster.
// Restricted to the society's own Teacher-in-Charge or an admin. The
// membership's academic_year_id is always the society's own year, never a
// client-supplied one — otherwise a caller could create a membership row
// whose year doesn't match the society it's supposedly a member of.
func (s *SocietyService) AssignMember(ctx context.Context, actor Actor, societyID uuid.UUID, req models.AssignSocietyMemberRequest) (db.SocietyMember, error) {
	society, err := s.authorizeTeacherInCharge(ctx, actor, societyID)
	if err != nil {
		return db.SocietyMember{}, err
	}

	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		return db.SocietyMember{}, fmt.Errorf("invalid student_id")
	}

	return s.repo.UpsertMember(ctx, db.UpsertSocietyMemberParams{
		SocietyID:      societyID,
		StudentID:      studentID,
		Role:           req.Role,
		AcademicYearID: society.AcademicYearID,
	})
}

// RemoveMember removes a student from a society's roster. societyID is
// passed explicitly (rather than looked up from the membership row) so
// authorization happens before any read of the membership itself, and the
// delete itself is scoped by societyID too — otherwise an authorized TIC of
// one society could delete a memberID belonging to a different society.
func (s *SocietyService) RemoveMember(ctx context.Context, actor Actor, societyID, memberID uuid.UUID) error {
	if _, err := s.authorizeTeacherInCharge(ctx, actor, societyID); err != nil {
		return err
	}

	n, err := s.repo.RemoveMember(ctx, societyID, memberID)
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrSocietyMemberNotFound
	}
	return nil
}
