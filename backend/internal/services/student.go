package services

import (
	"context"
	"fmt"
	"os"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/thunderid"
)

type StudentService struct {
	repo            *repositories.StudentRepository
	thunderIDClient *thunderid.Client
}

func NewStudentService(repo *repositories.StudentRepository, thunderIDClient *thunderid.Client) *StudentService {
	return &StudentService{repo: repo, thunderIDClient: thunderIDClient}
}

func (s *StudentService) CreateStudent(ctx context.Context, req models.CreateStudentRequest) (db.StudentProfile, error) {
	// check index number not already used
	_, err := s.repo.GetByIndexNumber(ctx, req.IndexNumber)
	if err == nil {
		return db.StudentProfile{}, fmt.Errorf("index number already exists")
	}

	// create user in ThunderID
	thunderUser, err := s.thunderIDClient.CreateUser(ctx, "student", map[string]interface{}{
		"username":     req.IndexNumber,
		"email":        req.Email,
		"given_name":   req.GivenName,
		"family_name":  req.FamilyName,
		"phone_number": req.PhoneNumber,
		"password":     req.Password,
	})
	if err != nil {
		return db.StudentProfile{}, fmt.Errorf("failed to create ThunderID user: %w", err)
	}

	userID, err := uuid.Parse(thunderUser.ID)
	if err != nil {
		return db.StudentProfile{}, fmt.Errorf("invalid ThunderID user ID: %w", err)
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
		_ = s.thunderIDClient.DeleteUser(ctx, thunderUser.ID)
		return db.StudentProfile{}, fmt.Errorf("failed to create user record: %w", err)
	}

	// assign student role in ThunderID
	if err := s.thunderIDClient.AssignRole(ctx, os.Getenv("THUNDERID_ROLE_STUDENT"), thunderUser.ID); err != nil {
		fmt.Printf("warning: failed to assign student role: %v\n", err)
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
	})
	if err != nil {
		_ = s.thunderIDClient.DeleteUser(ctx, thunderUser.ID)
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

func (s *StudentService) ListStudents(ctx context.Context) ([]db.StudentProfile, error) {
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

	// update ThunderID user with all required fields
	err = s.thunderIDClient.UpdateUser(ctx, userID, "student", map[string]interface{}{
		"username":     student.IndexNumber,
		"email":        user.Email,
		"given_name":   req.GivenName,
		"family_name":  req.FamilyName,
		"phone_number": req.PhoneNumber,
	})
	if err != nil {
		fmt.Printf("warning: failed to update ThunderID user: %v\n", err)
	}

	// update DB profile
	return s.repo.Update(ctx, db.UpdateStudentProfileParams{
		ID:             id,
		FullName:       fullName,
		Address:        pgtype.Text{String: req.Address, Valid: req.Address != ""},
		Phone:          pgtype.Text{String: req.PhoneNumber, Valid: req.PhoneNumber != ""},
		Whatsapp:       pgtype.Text{String: req.WhatsApp, Valid: req.WhatsApp != ""},
		SpecialRemarks: pgtype.Text{String: req.SpecialRemarks, Valid: req.SpecialRemarks != ""},
	})
}

func (s *StudentService) DeleteStudent(ctx context.Context, id uuid.UUID) error {
	student, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("student not found")
	}

	userID := uuid.UUID(student.UserID.Bytes)

	// delete from DB first
	if err := s.repo.DeleteStudent(ctx, id); err != nil {
		return fmt.Errorf("failed to delete student profile: %w", err)
	}

	if err := s.repo.DeleteUser(ctx, userID); err != nil {
		return fmt.Errorf("failed to delete user record: %w", err)
	}

	// delete from ThunderID
	if err := s.thunderIDClient.DeleteUser(ctx, userID.String()); err != nil {
		fmt.Printf("warning: failed to delete ThunderID user: %v\n", err)
	}

	return nil
}
