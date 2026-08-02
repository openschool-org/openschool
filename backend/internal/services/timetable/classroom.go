package timetable

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/openschool-org/openschool/db/sqlc"
	models "github.com/openschool-org/openschool/internal/models/timetable"
	repositories "github.com/openschool-org/openschool/internal/repositories/timetable"
)

var ErrClassroomNotFound = errors.New("classroom not found, or still referenced by a timetable")

type ClassroomService struct {
	repo *repositories.ClassroomRepository
}

func NewClassroomService(repo *repositories.ClassroomRepository) *ClassroomService {
	return &ClassroomService{repo: repo}
}

func (s *ClassroomService) Create(ctx context.Context, req models.CreateClassroomRequest) (db.Classroom, error) {
	params := db.CreateClassroomParams{Name: req.Name}
	if req.Code != "" {
		params.Code = pgtype.Text{String: req.Code, Valid: true}
	}
	if req.Capacity != nil {
		params.Capacity = pgtype.Int4{Int32: *req.Capacity, Valid: true}
	}
	return s.repo.Create(ctx, params)
}

func (s *ClassroomService) List(ctx context.Context) ([]db.Classroom, error) {
	return s.repo.List(ctx)
}

func (s *ClassroomService) Update(ctx context.Context, id uuid.UUID, req models.UpdateClassroomRequest) (db.Classroom, error) {
	params := db.UpdateClassroomParams{ID: id, Name: req.Name}
	if req.Code != "" {
		params.Code = pgtype.Text{String: req.Code, Valid: true}
	}
	if req.Capacity != nil {
		params.Capacity = pgtype.Int4{Int32: *req.Capacity, Valid: true}
	}
	return s.repo.Update(ctx, params)
}

func (s *ClassroomService) Delete(ctx context.Context, id uuid.UUID) error {
	n, err := s.repo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrClassroomNotFound
	}
	return nil
}
