package timetable

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type ClassroomRepository struct {
	queries *db.Queries
}

func NewClassroomRepository(pool *pgxpool.Pool) *ClassroomRepository {
	return &ClassroomRepository{queries: db.New(pool)}
}

func (r *ClassroomRepository) Create(ctx context.Context, params db.CreateClassroomParams) (db.Classroom, error) {
	return r.queries.CreateClassroom(ctx, params)
}

func (r *ClassroomRepository) GetByID(ctx context.Context, id uuid.UUID) (db.Classroom, error) {
	return r.queries.GetClassroomByID(ctx, id)
}

func (r *ClassroomRepository) List(ctx context.Context) ([]db.Classroom, error) {
	return r.queries.ListClassrooms(ctx)
}

func (r *ClassroomRepository) Update(ctx context.Context, params db.UpdateClassroomParams) (db.Classroom, error) {
	return r.queries.UpdateClassroom(ctx, params)
}

func (r *ClassroomRepository) Delete(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteClassroom(ctx, id)
}
