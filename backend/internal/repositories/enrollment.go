package repositories

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type EnrollmentRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewEnrollmentRepository(pool *pgxpool.Pool) *EnrollmentRepository {
	return &EnrollmentRepository{pool: pool, queries: db.New(pool)}
}

func (r *EnrollmentRepository) Create(ctx context.Context, params db.CreateStudentSubjectEnrollmentParams) (db.StudentSubjectEnrollment, error) {
	return r.queries.CreateStudentSubjectEnrollment(ctx, params)
}

func (r *EnrollmentRepository) Delete(ctx context.Context, params db.DeleteStudentSubjectEnrollmentParams) error {
	return r.queries.DeleteStudentSubjectEnrollment(ctx, params)
}

func (r *EnrollmentRepository) ListByStudent(ctx context.Context, params db.ListStudentEnrollmentsParams) ([]db.ListStudentEnrollmentsRow, error) {
	return r.queries.ListStudentEnrollments(ctx, params)
}

func (r *EnrollmentRepository) ListByStudentAndLevel(ctx context.Context, params db.ListStudentEnrollmentsByLevelParams) ([]db.ListStudentEnrollmentsByLevelRow, error) {
	return r.queries.ListStudentEnrollmentsByLevel(ctx, params)
}

func (r *EnrollmentRepository) ListStudentsBySubject(ctx context.Context, params db.ListStudentsBySubjectParams) ([]db.ListStudentsBySubjectRow, error) {
	return r.queries.ListStudentsBySubject(ctx, params)
}

func (r *EnrollmentRepository) ListStudentsByGroup(ctx context.Context, params db.ListStudentsByGroupParams) ([]db.ListStudentsByGroupRow, error) {
	return r.queries.ListStudentsByGroup(ctx, params)
}

// ReplaceForLevel swaps a student's picks for one level/year atomically: the
// old rows go, the new ones land, and a failure anywhere leaves the previous
// selection untouched.
func (r *EnrollmentRepository) ReplaceForLevel(
	ctx context.Context,
	clear db.DeleteStudentEnrollmentsForLevelParams,
	picks []db.CreateStudentSubjectEnrollmentParams,
) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	qtx := r.queries.WithTx(tx)

	if err := qtx.DeleteStudentEnrollmentsForLevel(ctx, clear); err != nil {
		return err
	}

	for _, p := range picks {
		if _, err := qtx.CreateStudentSubjectEnrollment(ctx, p); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}
