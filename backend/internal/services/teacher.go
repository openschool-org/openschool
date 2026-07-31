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
)

var (
	ErrTeacherNotFound = errors.New("teacher not found")
	ErrTeacherInUse    = errors.New("teacher is assigned to teach a class subject or has taken attendance sessions, and cannot be deleted")
)

type TeacherService struct {
	repo *repositories.TeacherRepository
	idp  identity.Provider
}

func NewTeacherService(repo *repositories.TeacherRepository, idp identity.Provider) *TeacherService {
	return &TeacherService{repo: repo, idp: idp}
}

func (s *TeacherService) CreateTeacher(ctx context.Context, req models.CreateTeacherRequest) (db.TeacherProfile, error) {
	// check employee number not already used
	_, err := s.repo.GetByEmployeeNumber(ctx, req.EmployeeNumber)
	if err == nil {
		return db.TeacherProfile{}, fmt.Errorf("employee number already exists")
	}

	idpUser, err := s.idp.CreateUser(ctx, "teacher", map[string]interface{}{
		"username":        req.Email,
		"email":           req.Email,
		"given_name":      req.GivenName,
		"family_name":     req.FamilyName,
		"phone_number":    req.PhoneNumber,
		"employee_number": req.EmployeeNumber,
		"password":        req.Password,
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
		ID:       userID,
		Email:    req.Email,
		FullName: fullName,
		Role:     "teacher",
	})
	if err != nil {
		rollbackIDPUser(ctx, s.idp, "CreateTeacher", idpUser.ID)
		return db.TeacherProfile{}, fmt.Errorf("failed to create user record: %w", err)
	}

	// assign teacher role in the identity provider
	if err := s.idp.AssignRole(ctx, identity.RoleID("teacher"), idpUser.ID); err != nil {
		log.Printf("CreateTeacher: failed to assign teacher role to %s: %v", idpUser.ID, err)
	}

	// create teacher profile
	profile, err := s.repo.Create(ctx, db.CreateTeacherProfileParams{
		UserID:         userID,
		FullName:       fullName,
		EmployeeNumber: req.EmployeeNumber,
		JoinedDate:     pgtype.Date{Time: req.JoinedDate, Valid: true},
		Phone:          pgtype.Text{String: req.PhoneNumber, Valid: req.PhoneNumber != ""},
		Title:          pgtype.Text{String: req.Title, Valid: req.Title != ""},
		Gender:         pgtype.Text{String: req.Gender, Valid: req.Gender != ""},
	})
	if err != nil {
		rollbackIDPUser(ctx, s.idp, "CreateTeacher", idpUser.ID)
		if delErr := s.repo.DeleteUser(ctx, userID); delErr != nil {
			log.Printf("CreateTeacher: failed to roll back local user row %s after error: %v (local user now orphaned)", userID, delErr)
		}
		return db.TeacherProfile{}, fmt.Errorf("failed to create teacher profile: %w", err)
	}

	return profile, nil
}

func (s *TeacherService) GetTeacher(ctx context.Context, id uuid.UUID) (db.TeacherProfile, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *TeacherService) ListTeachers(ctx context.Context) ([]db.TeacherProfile, error) {
	return s.repo.List(ctx)
}

func (s *TeacherService) UpdateTeacher(ctx context.Context, id uuid.UUID, req models.UpdateTeacherRequest) (db.TeacherProfile, error) {
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

	err = s.idp.UpdateUser(ctx, userID, "teacher", map[string]interface{}{
		"username":        user.Email,
		"email":           user.Email,
		"given_name":      req.GivenName,
		"family_name":     req.FamilyName,
		"phone_number":    req.PhoneNumber,
		"employee_number": req.EmployeeNumber,
	})
	if err != nil {
		fmt.Printf("warning: failed to update identity provider user: %v\n", err)
	}

	return s.repo.Update(ctx, db.UpdateTeacherProfileParams{
		ID:             id,
		FullName:       fullName,
		EmployeeNumber: req.EmployeeNumber,
		Phone:          pgtype.Text{String: req.PhoneNumber, Valid: req.PhoneNumber != ""},
		Title:          pgtype.Text{String: req.Title, Valid: req.Title != ""},
		Gender:         pgtype.Text{String: req.Gender, Valid: req.Gender != ""},
	})
}

func (s *TeacherService) DeleteTeacher(ctx context.Context, id uuid.UUID) error {
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

	if err := s.repo.DeleteUser(ctx, userID); err != nil {
		return fmt.Errorf("failed to delete user record: %w", err)
	}

	if err := s.idp.DeleteUser(ctx, userID.String()); err != nil {
		return fmt.Errorf("teacher profile deleted locally but failed to delete identity provider user (account is now orphaned and must be removed manually): %w", err)
	}

	return nil
}

func (s *TeacherService) AssignSubject(ctx context.Context, teacherID uuid.UUID, req models.AssignSubjectToTeacherRequest) error {
	subjectID, err := uuid.Parse(req.SubjectID)
	if err != nil {
		return fmt.Errorf("invalid subject id")
	}
	return s.repo.AssignSubject(ctx, teacherID, subjectID)
}

func (s *TeacherService) RemoveSubject(ctx context.Context, teacherID uuid.UUID, subjectID uuid.UUID) error {
	return s.repo.RemoveSubject(ctx, teacherID, subjectID)
}

func (s *TeacherService) ListSubjects(ctx context.Context, teacherID uuid.UUID) ([]db.Subject, error) {
	return s.repo.ListSubjects(ctx, teacherID)
}
