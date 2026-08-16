package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/validation"
)

var (
	ErrNonAcademicStaffNotFound          = errors.New("staff member not found")
	ErrInvalidNonAcademicDesignation     = errors.New("invalid designation")
	ErrInvalidNonAcademicEmploymentState = errors.New("invalid status — must be active, resigned or transferred")
)

type NonAcademicStaffService struct {
	repo  *repositories.NonAcademicStaffRepository
	audit *AuditService
}

func NewNonAcademicStaffService(repo *repositories.NonAcademicStaffRepository, audit *AuditService) *NonAcademicStaffService {
	return &NonAcademicStaffService{repo: repo, audit: audit}
}

func (s *NonAcademicStaffService) Create(ctx context.Context, req models.CreateNonAcademicStaffRequest) (db.NonAcademicStaff, error) {
	if !models.ValidNonAcademicDesignations[req.Designation] {
		return db.NonAcademicStaff{}, ErrInvalidNonAcademicDesignation
	}
	if !validation.IsValidSriLankanPhone(req.Phone) {
		return db.NonAcademicStaff{}, validation.ErrInvalidPhone
	}

	employeeNumber, err := s.repo.NextEmployeeNumber(ctx)
	if err != nil {
		return db.NonAcademicStaff{}, fmt.Errorf("failed to assign employee number: %w", err)
	}

	houseParam := pgtype.UUID{}
	if req.HouseID != "" {
		id, err := uuid.Parse(req.HouseID)
		if err != nil {
			return db.NonAcademicStaff{}, fmt.Errorf("invalid house id")
		}
		houseParam = pgtype.UUID{Bytes: id, Valid: true}
	}

	return s.repo.Create(ctx, db.CreateNonAcademicStaffParams{
		FullName:       req.FullName,
		EmployeeNumber: employeeNumber,
		Designation:    req.Designation,
		Phone:          pgtype.Text{String: req.Phone, Valid: req.Phone != ""},
		JoinedDate:     pgtype.Date{Time: req.JoinedDate, Valid: true},
		Gender:         pgtype.Text{String: req.Gender, Valid: req.Gender != ""},
		HouseID:        houseParam,
	})
}

func (s *NonAcademicStaffService) Get(ctx context.Context, id uuid.UUID) (db.NonAcademicStaff, error) {
	staff, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return db.NonAcademicStaff{}, ErrNonAcademicStaffNotFound
	}
	return staff, nil
}

func (s *NonAcademicStaffService) List(ctx context.Context, search, designation string) ([]db.NonAcademicStaff, error) {
	return s.repo.List(ctx, search, designation)
}

func (s *NonAcademicStaffService) Update(ctx context.Context, id uuid.UUID, req models.UpdateNonAcademicStaffRequest) (db.NonAcademicStaff, error) {
	if !models.ValidNonAcademicDesignations[req.Designation] {
		return db.NonAcademicStaff{}, ErrInvalidNonAcademicDesignation
	}
	if !validation.IsValidSriLankanPhone(req.Phone) {
		return db.NonAcademicStaff{}, validation.ErrInvalidPhone
	}
	return s.repo.Update(ctx, db.UpdateNonAcademicStaffParams{
		ID:          id,
		FullName:    req.FullName,
		Designation: req.Designation,
		Phone:       pgtype.Text{String: req.Phone, Valid: req.Phone != ""},
		Gender:      pgtype.Text{String: req.Gender, Valid: req.Gender != ""},
	})
}

func (s *NonAcademicStaffService) SetEmploymentStatus(ctx context.Context, id uuid.UUID, status string) (db.NonAcademicStaff, error) {
	if status != "active" && status != "resigned" && status != "transferred" {
		return db.NonAcademicStaff{}, ErrInvalidNonAcademicEmploymentState
	}
	return s.repo.UpdateEmploymentStatus(ctx, id, status)
}

// UpdateHouse is the admin-only manual house override, audited the same way
// as teacher/student house changes (Phase 1's pattern).
func (s *NonAcademicStaffService) UpdateHouse(ctx context.Context, id uuid.UUID, rawHouseID string, actorID uuid.UUID) (db.NonAcademicStaff, error) {
	var newHouseID *uuid.UUID
	if rawHouseID != "" {
		parsed, err := uuid.Parse(rawHouseID)
		if err != nil {
			return db.NonAcademicStaff{}, fmt.Errorf("invalid house id")
		}
		newHouseID = &parsed
	}

	before, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return db.NonAcademicStaff{}, ErrNonAcademicStaffNotFound
	}

	updated, err := s.repo.UpdateHouse(ctx, id, newHouseID)
	if err != nil {
		return db.NonAcademicStaff{}, err
	}

	if s.audit != nil {
		_ = s.audit.Record(ctx, "non_academic_staff_house", id, "house_changed", actorID,
			houseState{HouseID: pgUUIDToPtr(before.HouseID)},
			houseState{HouseID: newHouseID},
			"")
	}

	return updated, nil
}

func (s *NonAcademicStaffService) Delete(ctx context.Context, id uuid.UUID) error {
	rows, err := s.repo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNonAcademicStaffNotFound
	}
	return nil
}
