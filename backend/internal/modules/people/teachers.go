package people

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/idp"
	"github.com/openschool-org/openschool/internal/names"
	"github.com/openschool-org/openschool/internal/ports"
	"github.com/openschool-org/openschool/internal/validation"
)

var (
	ErrTeacherNotFound = errors.New("teacher not found")
	ErrTeacherInUse    = errors.New("teacher is assigned to a class subject or has taken attendance sessions, and cannot be deleted")
)

type teacherRecord struct {
	ID, UserID            uuid.UUID
	EmployeeNumber, Email string
}
type teacherStore interface {
	NextEmployee(context.Context) (string, error)
	GetTeacher(context.Context, uuid.UUID) (teacherRecord, error)
	CreateUser(context.Context, teacherUserCreate) error
	GetUserEmail(context.Context, uuid.UUID) (string, error)
	CreateTeacher(context.Context, teacherCreate) (any, error)
	UpdateTeacher(context.Context, uuid.UUID, teacherUpdate) (any, error)
	UpdateTeacherStatus(context.Context, uuid.UUID, string) (any, error)
	DeleteTeacher(context.Context, uuid.UUID) (int64, error)
	DeleteUser(context.Context, uuid.UUID) error
	AssignSubject(context.Context, uuid.UUID, uuid.UUID) error
	RemoveSubject(context.Context, uuid.UUID, uuid.UUID) error
	CountSubjects(context.Context, uuid.UUID) (int64, error)
	HasWorkload(context.Context, uuid.UUID) (bool, error)
	SetActive(context.Context, uuid.UUID, bool) error
}
type teacherUserCreate struct {
	ID                 uuid.UUID
	Email, FullName    string
	MustChangePassword bool
}
type teacherCreate struct {
	UserID                                              uuid.UUID
	FullName, EmployeeNumber, NIC, Phone, Title, Gender string
	NameWithInitials, CallingName                       string
	JoinedDate                                          time.Time
	HouseID                                             uuid.UUID
}
type teacherUpdate struct {
	FullName, NIC, Phone, Title, Gender string
	NameWithInitials, CallingName       string
}

type TeacherService struct {
	store  teacherStore
	idp    idp.Provider
	houses ports.HouseAssignments
	audit  ports.AuditRecorder
}

func NewTeacherService(store teacherStore, idp idp.Provider, houses ports.HouseAssignments, audit ports.AuditRecorder) *TeacherService {
	return &TeacherService{store: store, idp: idp, houses: houses, audit: audit}
}
func (s *TeacherService) Create(ctx context.Context, req CreateTeacherRequest, actor uuid.UUID) (any, error) {
	if !validation.NormalizePhoneField(&req.PhoneNumber) {
		return nil, validation.ErrInvalidPhone
	}
	employee, err := s.store.NextEmployee(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to assign employee number: %w", err)
	}
	req.FullName, req.NameWithInitials, req.CallingName = names.Normalize(req.FullName, req.NameWithInitials, req.CallingName)
	given, family := names.ForIdentityProvider(req.FullName, req.NameWithInitials, req.CallingName)
	u, err := s.idp.CreateUser(ctx, authz.RoleTeacher, map[string]any{"username": req.Email, "email": req.Email, "given_name": given, "family_name": family, "phone": req.PhoneNumber, "employee_number": employee, "password": req.NICNumber})
	if err != nil {
		return nil, fmt.Errorf("failed to create identity provider user: %w", err)
	}
	uid, err := uuid.Parse(u.ID)
	if err != nil {
		return nil, fmt.Errorf("invalid identity provider user ID: %w", err)
	}
	full := req.FullName
	if err = s.store.CreateUser(ctx, teacherUserCreate{ID: uid, Email: req.Email, FullName: full, MustChangePassword: true}); err != nil {
		_ = s.idp.DeleteUser(ctx, u.ID)
		return nil, fmt.Errorf("failed to create user record: %w", err)
	}
	rollback := func() { _ = s.idp.DeleteUser(ctx, u.ID); _ = s.store.DeleteUser(ctx, uid) }
	if err = s.idp.AssignRole(ctx, idp.RoleID(authz.RoleTeacher), u.ID); err != nil {
		rollback()
		return nil, fmt.Errorf("failed to assign teacher role: %w", err)
	}
	var house uuid.UUID
	if s.houses != nil {
		house, _ = s.houses.PickForTeacher(ctx)
	}
	profile, err := s.store.CreateTeacher(ctx, teacherCreate{UserID: uid, FullName: full, NameWithInitials: req.NameWithInitials, CallingName: req.CallingName, EmployeeNumber: employee, NIC: req.NICNumber, Phone: req.PhoneNumber, Title: req.Title, Gender: req.Gender, JoinedDate: req.JoinedDate, HouseID: house})
	if err != nil {
		rollback()
		return nil, fmt.Errorf("failed to create teacher profile: %w", err)
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "teacher_account", uid, "account_created", actor, nil, profile, "")
	}
	return profile, nil
}
func (s *TeacherService) Update(ctx context.Context, id uuid.UUID, req UpdateTeacherRequest) (any, error) {
	if !validation.NormalizePhoneField(&req.PhoneNumber) {
		return nil, validation.ErrInvalidPhone
	}
	t, err := s.store.GetTeacher(ctx, id)
	if err != nil {
		return nil, ErrTeacherNotFound
	}
	email, err := s.store.GetUserEmail(ctx, t.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}
	req.FullName, req.NameWithInitials, req.CallingName = names.Normalize(req.FullName, req.NameWithInitials, req.CallingName)
	given, family := names.ForIdentityProvider(req.FullName, req.NameWithInitials, req.CallingName)
	if err := s.idp.UpdateUser(ctx, t.UserID.String(), authz.RoleTeacher, map[string]any{"username": email, "email": email, "given_name": given, "family_name": family, "phone": req.PhoneNumber}); err != nil {
		log.Printf("UpdateTeacher: failed to update identity provider user: %v", err)
	}
	return s.store.UpdateTeacher(ctx, id, teacherUpdate{FullName: req.FullName, NameWithInitials: req.NameWithInitials, CallingName: req.CallingName, NIC: req.NICNumber, Phone: req.PhoneNumber, Title: req.Title, Gender: req.Gender})
}
func (s *TeacherService) UpdateHouse(ctx context.Context, id uuid.UUID, req UpdateTeacherHouseRequest, actor uuid.UUID) (any, error) {
	return s.houses.ChangeTeacherHouse(ctx, id, req.HouseID, actor)
}
func (s *TeacherService) UpdateStatus(ctx context.Context, id uuid.UUID, status string) (any, error) {
	if status != "active" && status != "resigned" && status != "transferred" {
		return nil, fmt.Errorf("invalid status %q — must be active, resigned or transferred", status)
	}
	return s.store.UpdateTeacherStatus(ctx, id, status)
}
func (s *TeacherService) Delete(ctx context.Context, id, actor uuid.UUID) error {
	t, err := s.store.GetTeacher(ctx, id)
	if err != nil {
		return ErrTeacherNotFound
	}
	rows, err := s.store.DeleteTeacher(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete teacher profile: %w", err)
	}
	if rows == 0 {
		return ErrTeacherInUse
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "teacher_account", t.UserID, "account_deleted", actor, t, nil, "")
	}
	if err = s.store.DeleteUser(ctx, t.UserID); err != nil {
		return err
	}
	return s.idp.DeleteUser(ctx, t.UserID.String())
}
func (s *TeacherService) AssignSubject(ctx context.Context, id uuid.UUID, req AssignSubjectToTeacherRequest) error {
	subject, err := uuid.Parse(req.SubjectID)
	if err != nil {
		return fmt.Errorf("invalid subject id")
	}
	if err = s.store.AssignSubject(ctx, id, subject); err != nil {
		return err
	}
	return s.store.SetActive(ctx, id, true)
}
func (s *TeacherService) RemoveSubject(ctx context.Context, id, subject uuid.UUID) error {
	if err := s.store.RemoveSubject(ctx, id, subject); err != nil {
		return err
	}
	n, err := s.store.CountSubjects(ctx, id)
	if err != nil || n > 0 {
		return err
	}
	busy, err := s.store.HasWorkload(ctx, id)
	if err != nil || busy {
		return err
	}
	return s.store.SetActive(ctx, id, false)
}
