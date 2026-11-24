// Package studentleadership owns prefect appointments, societies, and society rosters.
package studentleadership

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/openschool-org/openschool/internal/authz"
)

var (
	ErrPrefectNotFound       = errors.New("prefect assignment not found")
	ErrSocietyNotFound       = errors.New("society not found")
	ErrSocietyMemberNotFound = errors.New("active society membership not found")
	ErrNotTeacherInCharge    = errors.New("only the society's Teacher-in-Charge can manage its roster")
)

type Actor struct {
	ID   uuid.UUID
	Role string
}

type store interface {
	upsertPrefect(context.Context, uuid.UUID, uuid.UUID, string) (Prefect, error)
	listPrefectsByYear(context.Context, uuid.UUID) ([]PrefectListItem, error)
	listPrefectsByStudent(context.Context, uuid.UUID) ([]PrefectAppointment, error)
	listPrefectYears(context.Context) ([]AcademicYearOption, error)
	deletePrefect(context.Context, uuid.UUID) (int64, error)
	createSociety(context.Context, string, uuid.UUID, uuid.UUID) (Society, error)
	updateSociety(context.Context, uuid.UUID, string, uuid.UUID) (Society, error)
	deleteSociety(context.Context, uuid.UUID) (int64, error)
	getSociety(context.Context, uuid.UUID) (Society, error)
	getSocietyForTeacher(context.Context, uuid.UUID, uuid.UUID) (Society, error)
	listSocietiesByYear(context.Context, uuid.UUID) ([]SocietyListItem, error)
	listSocietyYears(context.Context) ([]AcademicYearOption, error)
	upsertSocietyMember(context.Context, uuid.UUID, uuid.UUID, string, uuid.UUID) (SocietyMember, error)
	listSocietyMembers(context.Context, uuid.UUID) ([]SocietyMemberListItem, error)
	deactivateSocietyMember(context.Context, uuid.UUID, uuid.UUID, string) (int64, error)
	listSocietyMembershipsByStudent(context.Context, uuid.UUID) ([]SocietyMembership, error)
	teacherIDByUser(context.Context, uuid.UUID) (uuid.UUID, error)
}

type Service struct{ store store }

func NewService(store store) *Service { return &Service{store: store} }

func (s *Service) AssignPrefect(ctx context.Context, req AssignPrefectRequest) (Prefect, error) {
	yearID, err := uuid.Parse(req.AcademicYearID)
	if err != nil {
		return Prefect{}, fmt.Errorf("invalid academic year id")
	}
	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		return Prefect{}, fmt.Errorf("invalid student id")
	}
	return s.store.upsertPrefect(ctx, yearID, studentID, req.Rank)
}

func (s *Service) ListPrefectsByYear(ctx context.Context, yearID uuid.UUID) ([]PrefectListItem, error) {
	return s.store.listPrefectsByYear(ctx, yearID)
}

func (s *Service) ListPrefectsByStudent(ctx context.Context, studentID uuid.UUID) ([]PrefectAppointment, error) {
	return s.store.listPrefectsByStudent(ctx, studentID)
}

func (s *Service) ListPrefectYears(ctx context.Context) ([]AcademicYearOption, error) {
	return s.store.listPrefectYears(ctx)
}

func (s *Service) DeletePrefect(ctx context.Context, id uuid.UUID) error {
	count, err := s.store.deletePrefect(ctx, id)
	if err != nil {
		return err
	}
	if count == 0 {
		return ErrPrefectNotFound
	}
	return nil
}

func (s *Service) CreateSociety(ctx context.Context, req CreateSocietyRequest) (Society, error) {
	teacherID, err := uuid.Parse(req.TeacherInChargeID)
	if err != nil {
		return Society{}, fmt.Errorf("invalid teacher_in_charge_id")
	}
	yearID, err := uuid.Parse(req.AcademicYearID)
	if err != nil {
		return Society{}, fmt.Errorf("invalid academic_year_id")
	}
	return s.store.createSociety(ctx, req.Name, teacherID, yearID)
}

func (s *Service) UpdateSociety(ctx context.Context, id uuid.UUID, req UpdateSocietyRequest) (Society, error) {
	teacherID, err := uuid.Parse(req.TeacherInChargeID)
	if err != nil {
		return Society{}, fmt.Errorf("invalid teacher_in_charge_id")
	}
	return s.store.updateSociety(ctx, id, req.Name, teacherID)
}

func (s *Service) DeleteSociety(ctx context.Context, id uuid.UUID) error {
	count, err := s.store.deleteSociety(ctx, id)
	if err != nil {
		return err
	}
	if count == 0 {
		return ErrSocietyNotFound
	}
	return nil
}

func (s *Service) ListSocietiesByYear(ctx context.Context, yearID uuid.UUID) ([]SocietyListItem, error) {
	return s.store.listSocietiesByYear(ctx, yearID)
}

func (s *Service) ListSocietyYears(ctx context.Context) ([]AcademicYearOption, error) {
	return s.store.listSocietyYears(ctx)
}

func (s *Service) GetSocietyForTeacher(ctx context.Context, teacherID, yearID uuid.UUID) (Society, error) {
	society, err := s.store.getSocietyForTeacher(ctx, teacherID, yearID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Society{}, ErrSocietyNotFound
	}
	return society, err
}

func (s *Service) ListSocietyMembers(ctx context.Context, societyID uuid.UUID) ([]SocietyMemberListItem, error) {
	return s.store.listSocietyMembers(ctx, societyID)
}

func (s *Service) ListSocietyMembershipsByStudent(ctx context.Context, studentID uuid.UUID) ([]SocietyMembership, error) {
	return s.store.listSocietyMembershipsByStudent(ctx, studentID)
}

func (s *Service) authorizeTeacherInCharge(ctx context.Context, actor Actor, societyID uuid.UUID) (Society, error) {
	society, err := s.store.getSociety(ctx, societyID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Society{}, ErrSocietyNotFound
	}
	if err != nil {
		return Society{}, err
	}
	if actor.Role == authz.RoleAdmin {
		return society, nil
	}
	teacherID, err := s.store.teacherIDByUser(ctx, actor.ID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Society{}, ErrNotTeacherInCharge
	}
	if err != nil {
		return Society{}, err
	}
	if society.TeacherInChargeID != teacherID {
		return Society{}, ErrNotTeacherInCharge
	}
	return society, nil
}

func (s *Service) AssignSocietyMember(ctx context.Context, actor Actor, societyID uuid.UUID, req AssignSocietyMemberRequest) (SocietyMember, error) {
	society, err := s.authorizeTeacherInCharge(ctx, actor, societyID)
	if err != nil {
		return SocietyMember{}, err
	}
	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		return SocietyMember{}, fmt.Errorf("invalid student_id")
	}
	return s.store.upsertSocietyMember(ctx, societyID, studentID, req.Role, society.AcademicYearID)
}

// DeactivateSocietyMember marks a member as left; the membership stays on their record.
func (s *Service) DeactivateSocietyMember(ctx context.Context, actor Actor, societyID, memberID uuid.UUID, reason string) error {
	if _, err := s.authorizeTeacherInCharge(ctx, actor, societyID); err != nil {
		return err
	}
	count, err := s.store.deactivateSocietyMember(ctx, societyID, memberID, strings.TrimSpace(reason))
	if err != nil {
		return err
	}
	if count == 0 {
		return ErrSocietyMemberNotFound
	}
	return nil
}
