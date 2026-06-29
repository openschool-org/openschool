package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type TeacherRepository struct {
	queries *db.Queries
}

func NewTeacherRepository(pool *pgxpool.Pool) *TeacherRepository {
	return &TeacherRepository{queries: db.New(pool)}
}

func (r *TeacherRepository) Create(ctx context.Context, params db.CreateTeacherProfileParams) (db.TeacherProfile, error) {
	return r.queries.CreateTeacherProfile(ctx, params)
}

func (r *TeacherRepository) GetByID(ctx context.Context, id uuid.UUID) (db.TeacherProfile, error) {
	return r.queries.GetTeacherByID(ctx, id)
}

func (r *TeacherRepository) GetByEmployeeNumber(ctx context.Context, employeeNumber string) (db.TeacherProfile, error) {
	return r.queries.GetTeacherByEmployeeNumber(ctx, employeeNumber)
}

func (r *TeacherRepository) List(ctx context.Context) ([]db.TeacherProfile, error) {
	return r.queries.ListTeachers(ctx)
}

func (r *TeacherRepository) Update(ctx context.Context, params db.UpdateTeacherProfileParams) (db.TeacherProfile, error) {
	return r.queries.UpdateTeacherProfile(ctx, params)
}

func (r *TeacherRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteTeacher(ctx, id)
}

func (r *TeacherRepository) AssignSubject(ctx context.Context, teacherID uuid.UUID, subjectID uuid.UUID) error {
	return r.queries.AssignSubjectToTeacher(ctx, db.AssignSubjectToTeacherParams{
		TeacherID: teacherID,
		SubjectID: subjectID,
	})
}

func (r *TeacherRepository) RemoveSubject(ctx context.Context, teacherID uuid.UUID, subjectID uuid.UUID) error {
	return r.queries.RemoveSubjectFromTeacher(ctx, db.RemoveSubjectFromTeacherParams{
		TeacherID: teacherID,
		SubjectID: subjectID,
	})
}

func (r *TeacherRepository) ListSubjects(ctx context.Context, teacherID uuid.UUID) ([]db.Subject, error) {
	return r.queries.ListSubjectsByTeacher(ctx, teacherID)
}

func (r *TeacherRepository) CreateUser(ctx context.Context, params db.CreateUserParams) (db.User, error) {
	return r.queries.CreateUser(ctx, params)
}

func (r *TeacherRepository) DeleteUser(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteUser(ctx, id)
}

func (r *TeacherRepository) GetUserByID(ctx context.Context, id uuid.UUID) (db.User, error) {
	return r.queries.GetUserByID(ctx, id)
}
