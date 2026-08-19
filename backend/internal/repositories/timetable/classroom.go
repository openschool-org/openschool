package timetable

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
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

func (r *ClassroomRepository) List(ctx context.Context) ([]db.ListClassroomsRow, error) {
	return r.queries.ListClassrooms(ctx)
}

// ListBySubject returns the free-standing lab rooms tagged to a subject —
// the auto-generator's pool of candidate rooms for that subject's lab
// periods.
func (r *ClassroomRepository) ListBySubject(ctx context.Context, subjectID uuid.UUID) ([]db.Classroom, error) {
	return r.queries.ListClassroomsBySubject(ctx, pgtype.UUID{Bytes: subjectID, Valid: true})
}

func (r *ClassroomRepository) Update(ctx context.Context, params db.UpdateClassroomParams) (db.Classroom, error) {
	return r.queries.UpdateClassroom(ctx, params)
}

func (r *ClassroomRepository) Delete(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteClassroom(ctx, id)
}
