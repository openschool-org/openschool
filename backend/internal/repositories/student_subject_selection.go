package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type StudentSubjectSelectionRepository struct {
	queries *db.Queries
}

func NewStudentSubjectSelectionRepository(pool *pgxpool.Pool) *StudentSubjectSelectionRepository {
	return &StudentSubjectSelectionRepository{queries: db.New(pool)}
}

func (r *StudentSubjectSelectionRepository) Upsert(ctx context.Context, params db.CreateStudentSubjectSelectionParams) (db.StudentSubjectSelection, error) {
	return r.queries.CreateStudentSubjectSelection(ctx, params)
}

func (r *StudentSubjectSelectionRepository) List(ctx context.Context, studentID uuid.UUID) ([]db.ListStudentSubjectSelectionsRow, error) {
	return r.queries.ListStudentSubjectSelections(ctx, studentID)
}

func (r *StudentSubjectSelectionRepository) Delete(ctx context.Context, params db.DeleteStudentSubjectSelectionParams) error {
	return r.queries.DeleteStudentSubjectSelection(ctx, params)
}
