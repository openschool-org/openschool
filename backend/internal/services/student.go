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
	repo *repositories.StudentRepository
	idp  identity.Provider
}

func NewStudentService(repo *repositories.StudentRepository, idp identity.Provider) *StudentService {
	return &StudentService{repo: repo, idp: idp}
}

func (s *StudentService) CreateStudent(ctx context.Context, req models.CreateStudentRequest) (db.StudentProfile, error) {
	// check index number not already used
	_, err := s.repo.GetByIndexNumber(ctx, req.IndexNumber)
	if err == nil {
		return db.StudentProfile{}, fmt.Errorf("index number already exists")
	}

	asgardeoUser, err := s.idp.CreateUser(ctx, "student", map[string]interface{}{
		"username":     req.IndexNumber,
		"email":        req.Email,
		"given_name":   req.GivenName,
		"family_name":  req.FamilyName,
		"phone_number": req.PhoneNumber,
		"password":     req.Password,
	})
	if err != nil {
		return db.StudentProfile{}, fmt.Errorf("failed to create identity provider user: %w", err)
	}

	userID, err := uuid.Parse(asgardeoUser.ID)
	if err != nil {
		return db.StudentProfile{}, fmt.Errorf("invalid identity provider user ID: %w", err)
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
		if delErr := s.idp.DeleteUser(ctx, asgardeoUser.ID); delErr != nil {
			log.Printf("CreateStudent: failed to roll back identity provider user %s after error: %v (identity provider account now orphaned)", asgardeoUser.ID, delErr)
		}
		return db.StudentProfile{}, fmt.Errorf("failed to create user record: %w", err)
	}

	// assign student role in the identity provider
	if err := s.idp.AssignRole(ctx, identity.RoleID("student"), asgardeoUser.ID); err != nil {
		log.Printf("CreateStudent: failed to assign student role to %s: %v", asgardeoUser.ID, err)
	}

	houseID := pgtype.UUID{}
	if houses, err := s.repo.ListHouses(ctx); err == nil {
		if id, ok := houseForIndex(req.IndexNumber, houses); ok {
			houseID = pgtype.UUID{Bytes: id, Valid: true}
		}
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
		if delErr := s.idp.DeleteUser(ctx, asgardeoUser.ID); delErr != nil {
			log.Printf("CreateStudent: failed to roll back identity provider user %s after error: %v (identity provider account now orphaned)", asgardeoUser.ID, delErr)
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
		"username":     student.IndexNumber,
		"email":        user.Email,
		"given_name":   req.GivenName,
		"family_name":  req.FamilyName,
		"phone_number": req.PhoneNumber,
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

func (s *StudentService) UpdateStudentHouse(ctx context.Context, id uuid.UUID, houseID string) (db.StudentProfile, error) {
	house := pgtype.UUID{}
	if houseID != "" {
		parsed, err := uuid.Parse(houseID)
		if err != nil {
			return db.StudentProfile{}, fmt.Errorf("invalid house id")
		}
		house = pgtype.UUID{Bytes: parsed, Valid: true}
	}

	return s.repo.UpdateHouse(ctx, db.UpdateStudentHouseParams{
		ID:      id,
		HouseID: house,
	})
}

func (s *StudentService) DeleteStudent(ctx context.Context, id uuid.UUID) error {
	student, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("student not found")
	}

	// Delete the identity provider account first and abort on failure
	if student.UserID.Valid {
		userID := uuid.UUID(student.UserID.Bytes)

		if err := s.idp.DeleteUser(ctx, userID.String()); err != nil {
			return fmt.Errorf("failed to delete identity provider user: %w", err)
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
