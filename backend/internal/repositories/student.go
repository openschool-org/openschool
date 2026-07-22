package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type StudentRepository struct {
	queries *db.Queries
}

func NewStudentRepository(pool *pgxpool.Pool) *StudentRepository {
	return &StudentRepository{queries: db.New(pool)}
}

func (r *StudentRepository) Create(ctx context.Context, params db.CreateStudentProfileParams) (db.StudentProfile, error) {
	return r.queries.CreateStudentProfile(ctx, params)
}

func (r *StudentRepository) GetByID(ctx context.Context, id uuid.UUID) (db.StudentProfile, error) {
	return r.queries.GetStudentByID(ctx, id)
}

func (r *StudentRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (db.StudentProfile, error) {
	return r.queries.GetStudentByUserID(ctx, pgtype.UUID{Bytes: userID, Valid: true})
}

func (r *StudentRepository) GetByIndexNumber(ctx context.Context, indexNumber string) (db.StudentProfile, error) {
	return r.queries.GetStudentByIndexNumber(ctx, indexNumber)
}

func (r *StudentRepository) List(ctx context.Context) ([]db.ListStudentsRow, error) {
	return r.queries.ListStudents(ctx)
}

func (r *StudentRepository) Update(ctx context.Context, params db.UpdateStudentProfileParams) (db.StudentProfile, error) {
	return r.queries.UpdateStudentProfile(ctx, params)
}

func (r *StudentRepository) GetWithClass(ctx context.Context, id uuid.UUID) (db.GetStudentWithClassRow, error) {
	return r.queries.GetStudentWithClass(ctx, id)
}

func (r *StudentRepository) ListByClass(ctx context.Context, classID uuid.UUID) ([]db.StudentProfile, error) {
	return r.queries.ListStudentsByClass(ctx, classID)
}

func (r *StudentRepository) CreateUser(ctx context.Context, params db.CreateUserParams) (db.User, error) {
	return r.queries.CreateUser(ctx, params)
}

func (r *StudentRepository) GetUserByID(ctx context.Context, id uuid.UUID) (db.User, error) {
	return r.queries.GetUserByID(ctx, id)
}

func (r *StudentRepository) DeleteStudent(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteStudentProfile(ctx, id)
}

func (r *StudentRepository) DeleteUser(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteUser(ctx, id)
}
