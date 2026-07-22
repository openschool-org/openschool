package services

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/asgardeo"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

type StudentService struct {
	repo           *repositories.StudentRepository
	asgardeoClient *asgardeo.Client
}

func NewStudentService(repo *repositories.StudentRepository, asgardeoClient *asgardeo.Client) *StudentService {
	return &StudentService{repo: repo, asgardeoClient: asgardeoClient}
}

func (s *StudentService) CreateStudent(ctx context.Context, req models.CreateStudentRequest) (db.StudentProfile, error) {
	// check index number not already used
	_, err := s.repo.GetByIndexNumber(ctx, req.IndexNumber)
	if err == nil {
		return db.StudentProfile{}, fmt.Errorf("index number already exists")
	}

	asgardeoUser, err := s.asgardeoClient.CreateUser(ctx, "student", map[string]interface{}{
		"username":     req.Email,
		"email":        req.Email,
		"given_name":   req.GivenName,
		"family_name":  req.FamilyName,
		"phone_number": req.PhoneNumber,
		"password":     req.Password,
	})
	if err != nil {
		return db.StudentProfile{}, fmt.Errorf("failed to create Asgardeo user: %w", err)
	}

	userID, err := uuid.Parse(asgardeoUser.ID)
	if err != nil {
		return db.StudentProfile{}, fmt.Errorf("invalid Asgardeo user ID: %w", err)
	}

	fullName := req.GivenName + " " + req.FamilyName

	// insert into users table
	_, err = s.repo.CreateUser(ctx, db.CreateUserParams{
		ID:       userID,
		Email:    req.Email,
		FullName: fullName,
		Role:     "student",
	})
	if err != nil {
		if delErr := s.asgardeoClient.DeleteUser(ctx, asgardeoUser.ID); delErr != nil {
			log.Printf("CreateStudent: failed to roll back Asgardeo user %s after error: %v (Asgardeo account now orphaned)", asgardeoUser.ID, delErr)
		}
		return db.StudentProfile{}, fmt.Errorf("failed to create user record: %w", err)
	}

	// assign student role in Asgardeo
	if err := s.asgardeoClient.AssignRole(ctx, os.Getenv("ASGARDEO_ROLE_STUDENT"), asgardeoUser.ID); err != nil {
		log.Printf("CreateStudent: failed to assign student role to %s: %v", asgardeoUser.ID, err)
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
	})
	if err != nil {
		if delErr := s.asgardeoClient.DeleteUser(ctx, asgardeoUser.ID); delErr != nil {
			log.Printf("CreateStudent: failed to roll back Asgardeo user %s after error: %v (Asgardeo account now orphaned)", asgardeoUser.ID, delErr)
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

	// update Asgardeo user with all required fields
	err = s.asgardeoClient.UpdateUser(ctx, userID, "student", map[string]interface{}{
		"username":     user.Email,
		"email":        user.Email,
		"given_name":   req.GivenName,
		"family_name":  req.FamilyName,
		"phone_number": req.PhoneNumber,
	})
	if err != nil {
		fmt.Printf("warning: failed to update Asgardeo user: %v\n", err)
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

func (s *StudentService) DeleteStudent(ctx context.Context, id uuid.UUID) error {
	student, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("student not found")
	}

	// Delete the Asgardeo account first and abort on failure
	if student.UserID.Valid {
		userID := uuid.UUID(student.UserID.Bytes)

		if err := s.asgardeoClient.DeleteUser(ctx, userID.String()); err != nil {
			return fmt.Errorf("failed to delete Asgardeo user: %w", err)
		}

		if err := s.repo.DeleteStudent(ctx, id); err != nil {
			return fmt.Errorf("failed to delete student profile: %w", err)
		}

		if err := s.repo.DeleteUser(ctx, userID); err != nil {
			return fmt.Errorf("failed to delete user record: %w", err)
		}

		return nil
	}

	if err := s.repo.DeleteStudent(ctx, id); err != nil {
		return fmt.Errorf("failed to delete student profile: %w", err)
	}

	return nil
}
