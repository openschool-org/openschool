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
)

var (
	ErrHouseNotFound = errors.New("house not found")
	ErrHouseInUse    = errors.New("house is assigned to a student or teacher and cannot be deleted")
)

type HouseService struct {
	repo        *repositories.HouseRepository
	studentRepo *repositories.StudentRepository
	teacherRepo *repositories.TeacherRepository
	audit       *AuditService
}

func NewHouseService(repo *repositories.HouseRepository, studentRepo *repositories.StudentRepository, teacherRepo *repositories.TeacherRepository, audit *AuditService) *HouseService {
	return &HouseService{repo: repo, studentRepo: studentRepo, teacherRepo: teacherRepo, audit: audit}
}

func (s *HouseService) CreateHouse(ctx context.Context, req models.CreateHouseRequest) (db.House, error) {
	return s.repo.Create(ctx, db.CreateHouseParams{
		Name:  req.Name,
		Code:  pgtype.Text{String: req.Code, Valid: req.Code != ""},
		Color: req.Color,
	})
}

func (s *HouseService) GetHouse(ctx context.Context, id uuid.UUID) (db.House, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *HouseService) ListHouses(ctx context.Context) ([]db.House, error) {
	return s.repo.List(ctx)
}

func (s *HouseService) UpdateHouse(ctx context.Context, id uuid.UUID, req models.UpdateHouseRequest) (db.House, error) {
	return s.repo.Update(ctx, db.UpdateHouseParams{
		ID:    id,
		Name:  req.Name,
		Code:  pgtype.Text{String: req.Code, Valid: req.Code != ""},
		Color: req.Color,
	})
}

func (s *HouseService) DeleteHouse(ctx context.Context, id uuid.UUID) error {
	rows, err := s.repo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		if _, err := s.repo.GetByID(ctx, id); err != nil {
			return ErrHouseNotFound
		}
		return ErrHouseInUse
	}
	return nil
}

// PickForStudent returns the id of whichever house currently holds the
// fewest students, breaking ties randomly. ok is false if no house exists
// yet.
func (s *HouseService) PickForStudent(ctx context.Context) (uuid.UUID, bool) {
	id, ok, err := s.repo.PickForStudent(ctx)
	if err != nil || !ok {
		return uuid.UUID{}, false
	}
	return id, true
}

// PickForTeacher mirrors PickForStudent against the separate staff pool.
func (s *HouseService) PickForTeacher(ctx context.Context) (uuid.UUID, bool) {
	id, ok, err := s.repo.PickForTeacher(ctx)
	if err != nil || !ok {
		return uuid.UUID{}, false
	}
	return id, true
}

// ReassignMissing assigns a balanced house to every student who doesn't
// have one yet (e.g. added before any house existed). Students are
// assigned one at a time, in sequence, so each pick reflects the counts
// left by the previous one and the cohort still comes out balanced.
func (s *HouseService) ReassignMissing(ctx context.Context) (int, error) {
	students, err := s.repo.ListStudentsMissingHouse(ctx)
	if err != nil {
		return 0, err
	}
	assigned := 0
	for _, student := range students {
		houseID, ok := s.PickForStudent(ctx)
		if !ok {
			break
		}
		if _, err := s.repo.UpdateStudentHouse(ctx, db.UpdateStudentHouseParams{
			ID:      student.ID,
			HouseID: pgtype.UUID{Bytes: houseID, Valid: true},
		}); err != nil {
			return assigned, err
		}
		assigned++
	}
	return assigned, nil
}

// ReassignMissingStaff mirrors ReassignMissing for teachers without a
// house.
func (s *HouseService) ReassignMissingStaff(ctx context.Context) (int, error) {
	teachers, err := s.repo.ListTeachersMissingHouse(ctx)
	if err != nil {
		return 0, err
	}
	assigned := 0
	for _, teacher := range teachers {
		houseID, ok := s.PickForTeacher(ctx)
		if !ok {
			break
		}
		if _, err := s.repo.UpdateTeacherHouse(ctx, db.UpdateTeacherHouseParams{
			ID:      teacher.ID,
			HouseID: pgtype.UUID{Bytes: houseID, Valid: true},
		}); err != nil {
			return assigned, err
		}
		assigned++
	}
	return assigned, nil
}

type houseState struct {
	HouseID *uuid.UUID `json:"house_id"`
}

func parseOptionalHouseID(raw string) (*uuid.UUID, error) {
	if raw == "" {
		return nil, nil
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("invalid house id")
	}
	return &id, nil
}

func pgUUIDToPtr(id pgtype.UUID) *uuid.UUID {
	if !id.Valid {
		return nil
	}
	u := uuid.UUID(id.Bytes)
	return &u
}

// ChangeStudentHouse is the only path allowed to move a student to a
// different house once one is assigned — a student's house is meant to be
// permanent, and this is the System Administrator override. Every call is
// recorded in the audit log.
func (s *HouseService) ChangeStudentHouse(ctx context.Context, studentID uuid.UUID, rawHouseID string, actorID uuid.UUID) (db.StudentProfile, error) {
	newHouseID, err := parseOptionalHouseID(rawHouseID)
	if err != nil {
		return db.StudentProfile{}, err
	}

	before, err := s.studentRepo.GetByID(ctx, studentID)
	if err != nil {
		return db.StudentProfile{}, err
	}

	houseParam := pgtype.UUID{}
	if newHouseID != nil {
		houseParam = pgtype.UUID{Bytes: *newHouseID, Valid: true}
	}

	updated, err := s.repo.UpdateStudentHouse(ctx, db.UpdateStudentHouseParams{ID: studentID, HouseID: houseParam})
	if err != nil {
		return db.StudentProfile{}, err
	}

	if s.audit != nil {
		_ = s.audit.Record(ctx, "student_house", studentID, "house_changed", actorID,
			houseState{HouseID: pgUUIDToPtr(before.HouseID)},
			houseState{HouseID: newHouseID},
			"")
	}

	return updated, nil
}

// ChangeTeacherHouse mirrors ChangeStudentHouse for staff.
func (s *HouseService) ChangeTeacherHouse(ctx context.Context, teacherID uuid.UUID, rawHouseID string, actorID uuid.UUID) (db.TeacherProfile, error) {
	newHouseID, err := parseOptionalHouseID(rawHouseID)
	if err != nil {
		return db.TeacherProfile{}, err
	}

	before, err := s.teacherRepo.GetByID(ctx, teacherID)
	if err != nil {
		return db.TeacherProfile{}, err
	}

	houseParam := pgtype.UUID{}
	if newHouseID != nil {
		houseParam = pgtype.UUID{Bytes: *newHouseID, Valid: true}
	}

	updated, err := s.repo.UpdateTeacherHouse(ctx, db.UpdateTeacherHouseParams{ID: teacherID, HouseID: houseParam})
	if err != nil {
		return db.TeacherProfile{}, err
	}

	if s.audit != nil {
		_ = s.audit.Record(ctx, "teacher_house", teacherID, "house_changed", actorID,
			houseState{HouseID: pgUUIDToPtr(before.HouseID)},
			houseState{HouseID: newHouseID},
			"")
	}

	return updated, nil
}
