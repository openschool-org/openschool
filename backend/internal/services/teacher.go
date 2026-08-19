package services

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/identity"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/validation"
)

var (
	ErrTeacherNotFound = errors.New("teacher not found")
	ErrTeacherInUse    = errors.New("teacher is assigned to teach a class subject or has taken attendance sessions, and cannot be deleted")
)

type TeacherService struct {
	repo     *repositories.TeacherRepository
	idp      identity.Provider
	houseSvc *HouseService
	audit    *AuditService
}

func NewTeacherService(repo *repositories.TeacherRepository, idp identity.Provider, houseSvc *HouseService, audit *AuditService) *TeacherService {
	return &TeacherService{repo: repo, idp: idp, houseSvc: houseSvc, audit: audit}
}

func (s *TeacherService) CreateTeacher(ctx context.Context, req models.CreateTeacherRequest, actorID uuid.UUID) (db.TeacherProfile, error) {
	if !validation.IsValidSriLankanPhone(req.PhoneNumber) {
		return db.TeacherProfile{}, validation.ErrInvalidPhone
	}

	// employee_number is auto-assigned from the shared sequence (Phase 6.1) —
	// fetched up-front since the identity provider user needs it as an attribute.
	employeeNumber, err := s.repo.NextEmployeeNumber(ctx)
	if err != nil {
		return db.TeacherProfile{}, fmt.Errorf("failed to assign employee number: %w", err)
	}

	// NIC number doubles as the initial (one-time) password (Phase 8.2) —
	// there is no separate manual password entry anymore.
	idpUser, err := s.idp.CreateUser(ctx, models.RoleTeacher, map[string]interface{}{
		"username":        req.Email,
		"email":           req.Email,
		"given_name":      req.GivenName,
		"family_name":     req.FamilyName,
		"phone":           req.PhoneNumber,
		"employee_number": employeeNumber,
		"password":        req.NICNumber,
	})
	if err != nil {
		return db.TeacherProfile{}, fmt.Errorf("failed to create identity provider user: %w", err)
	}

	userID, err := uuid.Parse(idpUser.ID)
	if err != nil {
		return db.TeacherProfile{}, fmt.Errorf("invalid identity provider user ID: %w", err)
	}

	fullName := req.GivenName + " " + req.FamilyName

	// insert into users table
	_, err = s.repo.CreateUser(ctx, db.CreateUserParams{
		ID:                 userID,
		Email:              req.Email,
		FullName:           fullName,
		Role:               models.RoleTeacher,
		MustChangePassword: true,
	})
	if err != nil {
		rollbackIDPUser(ctx, s.idp, "CreateTeacher", idpUser.ID)
		return db.TeacherProfile{}, fmt.Errorf("failed to create user record: %w", err)
	}

	// assign teacher role in the identity provider — a failure here must be
	// a hard error, not just a log line: without it, the account gets
	// created successfully but no teacher claim ever lands on its JWT, so
	// every later request from it is rejected with 403 and no clue why.
	if err := s.idp.AssignRole(ctx, identity.RoleID(models.RoleTeacher), idpUser.ID); err != nil {
		rollbackIDPUser(ctx, s.idp, "CreateTeacher", idpUser.ID)
		if delErr := s.repo.DeleteUser(ctx, userID); delErr != nil {
			log.Printf("CreateTeacher: failed to roll back local user row %s after error: %v (local user now orphaned)", userID, delErr)
		}
		return db.TeacherProfile{}, fmt.Errorf("failed to assign teacher role: %w", err)
	}

	houseID := pgtype.UUID{}
	if id, ok := s.houseSvc.PickForTeacher(ctx); ok {
		houseID = pgtype.UUID{Bytes: id, Valid: true}
	}

	// create teacher profile
	profile, err := s.repo.Create(ctx, db.CreateTeacherProfileParams{
		UserID:         userID,
		FullName:       fullName,
		EmployeeNumber: employeeNumber,
		NicNumber:      req.NICNumber,
		JoinedDate:     pgtype.Date{Time: req.JoinedDate, Valid: true},
		Phone:          pgtype.Text{String: req.PhoneNumber, Valid: req.PhoneNumber != ""},
		Title:          pgtype.Text{String: req.Title, Valid: req.Title != ""},
		Gender:         pgtype.Text{String: req.Gender, Valid: req.Gender != ""},
		HouseID:        houseID,
	})
	if err != nil {
		rollbackIDPUser(ctx, s.idp, "CreateTeacher", idpUser.ID)
		if delErr := s.repo.DeleteUser(ctx, userID); delErr != nil {
			log.Printf("CreateTeacher: failed to roll back local user row %s after error: %v (local user now orphaned)", userID, delErr)
		}
		return db.TeacherProfile{}, fmt.Errorf("failed to create teacher profile: %w", err)
	}

	if s.audit != nil {
		_ = s.audit.Record(ctx, "teacher_account", userID, "account_created", actorID, nil, profile, "")
	}

	return profile, nil
}

func (s *TeacherService) GetTeacher(ctx context.Context, id uuid.UUID) (db.GetTeacherByIDRow, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *TeacherService) ListTeachers(ctx context.Context) ([]db.TeacherProfile, error) {
	return s.repo.List(ctx)
}

func (s *TeacherService) UpdateTeacher(ctx context.Context, id uuid.UUID, req models.UpdateTeacherRequest) (db.TeacherProfile, error) {
	if !validation.IsValidSriLankanPhone(req.PhoneNumber) {
		return db.TeacherProfile{}, validation.ErrInvalidPhone
	}

	teacher, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return db.TeacherProfile{}, fmt.Errorf("teacher not found")
	}

	fullName := req.GivenName + " " + req.FamilyName
	userID := teacher.UserID.String()

	user, err := s.repo.GetUserByID(ctx, teacher.UserID)
	if err != nil {
		return db.TeacherProfile{}, fmt.Errorf("user not found")
	}

	err = s.idp.UpdateUser(ctx, userID, models.RoleTeacher, map[string]interface{}{
		"username":    user.Email,
		"email":       user.Email,
		"given_name":  req.GivenName,
		"family_name": req.FamilyName,
		"phone":       req.PhoneNumber,
	})
	if err != nil {
		log.Printf("UpdateTeacher: failed to update identity provider user: %v", err)
	}

	return s.repo.Update(ctx, db.UpdateTeacherProfileParams{
		ID:        id,
		FullName:  fullName,
		Phone:     pgtype.Text{String: req.PhoneNumber, Valid: req.PhoneNumber != ""},
		Title:     pgtype.Text{String: req.Title, Valid: req.Title != ""},
		Gender:    pgtype.Text{String: req.Gender, Valid: req.Gender != ""},
		NicNumber: req.NICNumber,
	})
}

// UpdateTeacherHouse delegates to HouseService so every change is audit-logged.
func (s *TeacherService) UpdateTeacherHouse(ctx context.Context, id uuid.UUID, houseID string, actorID uuid.UUID) (db.TeacherProfile, error) {
	return s.houseSvc.ChangeTeacherHouse(ctx, id, houseID, actorID)
}

var validEmploymentStatuses = map[string]bool{"active": true, "resigned": true, "transferred": true}

// SetEmploymentStatus marks a teacher active, resigned, or transferred —
// separate from is_active (which tracks subject assignment, not employment).
func (s *TeacherService) SetEmploymentStatus(ctx context.Context, id uuid.UUID, status string) (db.TeacherProfile, error) {
	if !validEmploymentStatuses[status] {
		return db.TeacherProfile{}, fmt.Errorf("invalid status %q — must be active, resigned or transferred", status)
	}
	return s.repo.UpdateEmploymentStatus(ctx, id, status)
}

func (s *TeacherService) DeleteTeacher(ctx context.Context, id uuid.UUID, actorID uuid.UUID) error {
	teacher, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return ErrTeacherNotFound
	}

	userID := teacher.UserID // uuid.UUID directly

	rows, err := s.repo.Delete(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete teacher profile: %w", err)
	}
	if rows == 0 {
		return ErrTeacherInUse
	}

	if s.audit != nil {
		_ = s.audit.Record(ctx, "teacher_account", userID, "account_deleted", actorID, teacher, nil, "")
	}

	if err := s.repo.DeleteUser(ctx, userID); err != nil {
		// Unlike the IDP-delete failure below, this leaves the local users
		// row AND the identity provider account both fully live and able to
		// authenticate, with no teacher profile anywhere — worse than the
		// documented orphan case, since the account still works. Retrying
		// this same delete call is safe (teacher profile is already gone).
		return fmt.Errorf("teacher profile deleted but failed to delete local user record — the account (id %s) can still sign in with no profile and must be removed manually or by retrying this delete: %w", userID, err)
	}

	if err := s.idp.DeleteUser(ctx, userID.String()); err != nil {
		return fmt.Errorf("teacher profile deleted locally but failed to delete identity provider user (account is now orphaned and must be removed manually): %w", err)
	}

	return nil
}

// AssignSubject gives the teacher a subject qualification. A teacher becomes
// an active teaching staff member as soon as they have at least one subject.
func (s *TeacherService) AssignSubject(ctx context.Context, teacherID uuid.UUID, req models.AssignSubjectToTeacherRequest) error {
	subjectID, err := uuid.Parse(req.SubjectID)
	if err != nil {
		return fmt.Errorf("invalid subject id")
	}
	if err := s.repo.AssignSubject(ctx, teacherID, subjectID); err != nil {
		return err
	}
	return s.repo.SetActiveStatus(ctx, teacherID, true)
}

// RemoveSubject revokes a subject qualification. A teacher with no subjects
// left cannot be an active teaching staff member, per business rule.
func (s *TeacherService) RemoveSubject(ctx context.Context, teacherID uuid.UUID, subjectID uuid.UUID) error {
	if err := s.repo.RemoveSubject(ctx, teacherID, subjectID); err != nil {
		return err
	}

	remaining, err := s.repo.CountSubjects(ctx, teacherID)
	if err != nil {
		return err
	}
	if remaining == 0 {
		return s.repo.SetActiveStatus(ctx, teacherID, false)
	}
	return nil
}

// GetWorkload lists every class+subject a teacher is assigned to teach.
func (s *TeacherService) GetWorkload(ctx context.Context, teacherID uuid.UUID) ([]db.ListTeacherWorkloadRow, error) {
	return s.repo.ListWorkload(ctx, teacherID)
}

func (s *TeacherService) ListSubjects(ctx context.Context, teacherID uuid.UUID) ([]db.Subject, error) {
	return s.repo.ListSubjects(ctx, teacherID)
}
