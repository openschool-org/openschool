package repositories

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type SearchRepository struct {
	queries *db.Queries
}

func NewSearchRepository(pool *pgxpool.Pool) *SearchRepository {
	return &SearchRepository{queries: db.New(pool)}
}

func termArg(term string) pgtype.Text {
	return pgtype.Text{String: term, Valid: true}
}

func (r *SearchRepository) Students(ctx context.Context, term string) ([]db.SearchStudentsRow, error) {
	return r.queries.SearchStudents(ctx, termArg(term))
}

func (r *SearchRepository) Teachers(ctx context.Context, term string) ([]db.SearchTeachersRow, error) {
	return r.queries.SearchTeachers(ctx, termArg(term))
}

func (r *SearchRepository) Guardians(ctx context.Context, term string) ([]db.SearchGuardiansRow, error) {
	return r.queries.SearchGuardians(ctx, termArg(term))
}

func (r *SearchRepository) NonAcademicStaff(ctx context.Context, term string) ([]db.SearchNonAcademicStaffRow, error) {
	return r.queries.SearchNonAcademicStaff(ctx, termArg(term))
}
