package services

import (
	"context"
	"errors"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

var (
	ErrHouseNotFound = errors.New("house not found")
	ErrHouseInUse    = errors.New("house is assigned to a student and cannot be deleted")
)

type HouseService struct {
	repo *repositories.HouseRepository
}

func NewHouseService(repo *repositories.HouseRepository) *HouseService {
	return &HouseService{repo: repo}
}

func houseForIndex(indexNumber string, houses []db.House) (uuid.UUID, bool) {
	if len(houses) == 0 {
		return uuid.UUID{}, false
	}
	n, err := strconv.Atoi(strings.TrimSpace(indexNumber))
	if err != nil {
		return uuid.UUID{}, false
	}
	r := n % len(houses)
	if r < 0 {
		r += len(houses)
	}
	for _, h := range houses {
		if int(h.Remainder) == r {
			return h.ID, true
		}
	}
	return uuid.UUID{}, false
}

func (s *HouseService) CreateHouse(ctx context.Context, req models.CreateHouseRequest) (db.House, error) {
	return s.repo.Create(ctx, db.CreateHouseParams{
		Name:      req.Name,
		Code:      pgtype.Text{String: req.Code, Valid: req.Code != ""},
		Remainder: int32(req.Remainder),
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
		ID:        id,
		Name:      req.Name,
		Code:      pgtype.Text{String: req.Code, Valid: req.Code != ""},
		Remainder: int32(req.Remainder),
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

func (s *HouseService) ReassignMissing(ctx context.Context) (int, error) {
	houses, err := s.repo.List(ctx)
	if err != nil {
		return 0, err
	}
	if len(houses) == 0 {
		return 0, nil
	}

	students, err := s.repo.ListStudentsMissingHouse(ctx)
	if err != nil {
		return 0, err
	}

	assigned := 0
	for _, student := range students {
		houseID, ok := houseForIndex(student.IndexNumber, houses)
		if !ok {
			continue
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
