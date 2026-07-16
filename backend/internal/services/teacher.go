package services

import (
	"context"
	"errors"
	"fmt"
	"os"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/asgardeo"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

var (
	ErrTeacherNotFound = errors.New("teacher not found")
	ErrTeacherInUse    = errors.New("teacher is assigned to teach a class subject or has taken attendance sessions, and cannot be deleted")
)

type TeacherService struct {
	repo           *repositories.TeacherRepository
	asgardeoClient *asgardeo.Client
}

func NewTeacherService(repo *repositories.TeacherRepository, asgardeoClient *asgardeo.Client) *TeacherService {
	return &TeacherService{repo: repo, asgardeoClient: asgardeoClient}
}

func (s *TeacherService) CreateTeacher(ctx context.Context, req models.CreateTeacherRequest) (db.TeacherProfile, error) {
	// check employee number not already used
	_, err := s.repo.GetByEmployeeNumber(ctx, req.EmployeeNumber)
	if err == nil {
		return db.TeacherProfile{}, fmt.Errorf("employee number already exists")
	}

	asgardeoUser, err := s.asgardeoClient.CreateUser(ctx, "teacher", map[string]interface{}{
		"username":        req.Email,
		"email":           req.Email,
		"given_name":      req.GivenName,
		"family_name":     req.FamilyName,
		"phone_number":    req.PhoneNumber,
		"employee_number": req.EmployeeNumber,
		"password":        req.Password,
	})
	if err != nil {
		return db.TeacherProfile{}, fmt.Errorf("failed to create Asgardeo user: %w", err)
	}

	userID, err := uuid.Parse(asgardeoUser.ID)
	if err != nil {
		return db.TeacherProfile{}, fmt.Errorf("invalid Asgardeo user ID: %w", err)
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
		_ = s.asgardeoClient.DeleteUser(ctx, asgardeoUser.ID)
		return db.TeacherProfile{}, fmt.Errorf("failed to create user record: %w", err)
	}

	// assign teacher role in Asgardeo
	if err := s.asgardeoClient.AssignRole(ctx, os.Getenv("ASGARDEO_ROLE_TEACHER"), asgardeoUser.ID); err != nil {
		fmt.Printf("warning: failed to assign teacher role: %v\n", err)
	}

	// create teacher profile
	profile, err := s.repo.Create(ctx, db.CreateTeacherProfileParams{
		UserID:         userID,
		FullName:       fullName,
		EmployeeNumber: req.EmployeeNumber,
		JoinedDate:     pgtype.Date{Time: req.JoinedDate, Valid: true},
		Phone:          pgtype.Text{String: req.PhoneNumber, Valid: req.PhoneNumber != ""},
	})
	if err != nil {
		_ = s.asgardeoClient.DeleteUser(ctx, asgardeoUser.ID)
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

	err = s.asgardeoClient.UpdateUser(ctx, userID, "teacher", map[string]interface{}{
		"username":        user.Email,
		"email":           user.Email,
		"given_name":      req.GivenName,
		"family_name":     req.FamilyName,
		"phone_number":    req.PhoneNumber,
		"employee_number": req.EmployeeNumber,
	})
	if err != nil {
		fmt.Printf("warning: failed to update Asgardeo user: %v\n", err)
	}

	return s.repo.Update(ctx, db.UpdateTeacherProfileParams{
		ID:             id,
		FullName:       fullName,
		EmployeeNumber: req.EmployeeNumber,
		Phone:          pgtype.Text{String: req.PhoneNumber, Valid: req.PhoneNumber != ""},
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

	if err := s.asgardeoClient.DeleteUser(ctx, userID.String()); err != nil {
		fmt.Printf("warning: failed to delete Asgardeo user: %v\n", err)
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
