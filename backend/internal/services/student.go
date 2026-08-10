package services

import (
	"context"
	"fmt"
	"log"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/identity"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

type StudentService struct {
	repo     *repositories.StudentRepository
	idp      identity.Provider
	houseSvc *HouseService
}

func NewStudentService(repo *repositories.StudentRepository, idp identity.Provider, houseSvc *HouseService) *StudentService {
	return &StudentService{repo: repo, idp: idp, houseSvc: houseSvc}
}

func (s *StudentService) CreateStudent(ctx context.Context, req models.CreateStudentRequest) (db.StudentProfile, error) {
	// check index number not already used
	_, err := s.repo.GetByIndexNumber(ctx, req.IndexNumber)
	if err == nil {
		return db.StudentProfile{}, fmt.Errorf("index number already exists")
	}

	// index_number doubles as both username and the initial (one-time)
	// password (Phase 8.2) — there is no separate manual password entry.
	idpUser, err := s.idp.CreateUser(ctx, "student", map[string]interface{}{
		"username":    req.IndexNumber,
		"email":       req.Email,
		"given_name":  req.GivenName,
		"family_name": req.FamilyName,
		"phone":       req.PhoneNumber,
		"password":    req.IndexNumber,
	})
	if err != nil {
		return db.StudentProfile{}, fmt.Errorf("failed to create identity provider user: %w", err)
	}

	userID, err := uuid.Parse(idpUser.ID)
	if err != nil {
		return db.StudentProfile{}, fmt.Errorf("invalid identity provider user ID: %w", err)
	}

	fullName := req.GivenName + " " + req.FamilyName

	// insert into users table
	_, err = s.repo.CreateUser(ctx, db.CreateUserParams{
		ID:                 userID,
		Email:              req.Email,
		FullName:           fullName,
		Role:               "student",
		MustChangePassword: true,
	})
	if err != nil {
		rollbackIDPUser(ctx, s.idp, "CreateStudent", idpUser.ID)
		return db.StudentProfile{}, fmt.Errorf("failed to create user record: %w", err)
	}

	// assign student role in the identity provider
	if err := s.idp.AssignRole(ctx, identity.RoleID("student"), idpUser.ID); err != nil {
		log.Printf("CreateStudent: failed to assign student role to %s: %v", idpUser.ID, err)
	}

	houseID := pgtype.UUID{}
	if id, ok := s.houseSvc.PickForStudent(ctx); ok {
		houseID = pgtype.UUID{Bytes: id, Valid: true}
	}

	// create student profile
	profile, err := s.repo.Create(ctx, db.CreateStudentProfileParams{
		UserID:         pgtype.UUID{Bytes: userID, Valid: true},
		FullName:       fullName,
		IndexNumber:    req.IndexNumber,
		Address:        pgtype.Text{String: req.Address, Valid: req.Address != ""},
		Phone:          pgtype.Text{String: req.PhoneNumber, Valid: req.PhoneNumber != ""},
		Whatsapp:       pgtype.Text{String: req.WhatsApp, Valid: req.WhatsApp != ""},
		SpecialRemarks: pgtype.Text{String: req.SpecialRemarks, Valid: req.SpecialRemarks != ""},
		Gender:         pgtype.Text{String: req.Gender, Valid: req.Gender != ""},
		HouseID:        houseID,
	})
	if err != nil {
		rollbackIDPUser(ctx, s.idp, "CreateStudent", idpUser.ID)
		if delErr := s.repo.DeleteUser(ctx, userID); delErr != nil {
			log.Printf("CreateStudent: failed to roll back local user row %s after error: %v (local user now orphaned)", userID, delErr)
		}
		return db.StudentProfile{}, fmt.Errorf("failed to create student profile: %w", err)
	}

	return profile, nil
}

func (s *StudentService) GetStudent(ctx context.Context, id uuid.UUID) (db.StudentProfile, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *StudentService) GetStudentWithClass(ctx context.Context, id uuid.UUID) (db.GetStudentWithClassRow, error) {
	return s.repo.GetWithClass(ctx, id)
}

func (s *StudentService) ListStudents(ctx context.Context) ([]db.ListStudentsRow, error) {
	return s.repo.List(ctx)
}

func (s *StudentService) ListStudentsByClass(ctx context.Context, classID uuid.UUID) ([]db.StudentProfile, error) {
	return s.repo.ListByClass(ctx, classID)
}

func (s *StudentService) UpdateStudent(ctx context.Context, id uuid.UUID, req models.UpdateStudentRequest) (db.StudentProfile, error) {
	// get student to find user_id
	student, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return db.StudentProfile{}, fmt.Errorf("student not found")
	}

	fullName := req.GivenName + " " + req.FamilyName
	userID := uuid.UUID(student.UserID.Bytes).String()

	// get user to have email
	user, err := s.repo.GetUserByID(ctx, uuid.UUID(student.UserID.Bytes))
	if err != nil {
		return db.StudentProfile{}, fmt.Errorf("user not found")
	}

	// update identity provider user with all required fields
	err = s.idp.UpdateUser(ctx, userID, "student", map[string]interface{}{
		"username":    student.IndexNumber,
		"email":       user.Email,
		"given_name":  req.GivenName,
		"family_name": req.FamilyName,
		"phone":       req.PhoneNumber,
	})
	if err != nil {
		fmt.Printf("warning: failed to update identity provider user: %v\n", err)
	}

	// update DB profile
	return s.repo.Update(ctx, db.UpdateStudentProfileParams{
		ID:             id,
		FullName:       fullName,
		Address:        pgtype.Text{String: req.Address, Valid: req.Address != ""},
		Phone:          pgtype.Text{String: req.PhoneNumber, Valid: req.PhoneNumber != ""},
		Whatsapp:       pgtype.Text{String: req.WhatsApp, Valid: req.WhatsApp != ""},
		SpecialRemarks: pgtype.Text{String: req.SpecialRemarks, Valid: req.SpecialRemarks != ""},
		Gender:         pgtype.Text{String: req.Gender, Valid: req.Gender != ""},
	})
}

var validEnrollmentStatuses = map[string]bool{"active": true, "left": true}

// SetEnrollmentStatus marks a student active or left (e.g. withdrawn/
// transferred out of the school).
func (s *StudentService) SetEnrollmentStatus(ctx context.Context, id uuid.UUID, status string) (db.StudentProfile, error) {
	if !validEnrollmentStatuses[status] {
		return db.StudentProfile{}, fmt.Errorf("invalid status %q — must be active or left", status)
	}
	return s.repo.UpdateEnrollmentStatus(ctx, id, status)
}

// UpdateStudentHouse is the System-Administrator-only override for moving a
// student to a different house once one is assigned. It delegates to
// HouseService so every change is audit-logged.
func (s *StudentService) UpdateStudentHouse(ctx context.Context, id uuid.UUID, houseID string, actorID uuid.UUID) (db.StudentProfile, error) {
	return s.houseSvc.ChangeStudentHouse(ctx, id, houseID, actorID)
}

func (s *StudentService) DeleteStudent(ctx context.Context, id uuid.UUID) error {
	student, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("student not found")
	}

	if err := s.repo.DeleteStudent(ctx, id); err != nil {
		return fmt.Errorf("failed to delete student profile: %w", err)
	}

	if !student.UserID.Valid {
		return nil
	}

	userID := uuid.UUID(student.UserID.Bytes)

	if err := s.repo.DeleteUser(ctx, userID); err != nil {
		return fmt.Errorf("failed to delete user record: %w", err)
	}

	if err := s.idp.DeleteUser(ctx, userID.String()); err != nil {
		return fmt.Errorf("student profile deleted locally but failed to delete identity provider user (account is now orphaned and must be removed manually): %w", err)
	}

	return nil
}
