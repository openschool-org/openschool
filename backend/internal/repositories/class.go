package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type ClassRepository struct {
	queries *db.Queries
}

func NewClassRepository(pool *pgxpool.Pool) *ClassRepository {
	return &ClassRepository{queries: db.New(pool)}
}

func (r *ClassRepository) Create(ctx context.Context, params db.CreateClassParams) (db.Class, error) {
	return r.queries.CreateClass(ctx, params)
}

func (r *ClassRepository) GetByID(ctx context.Context, id uuid.UUID) (db.Class, error) {
	return r.queries.GetClassByID(ctx, id)
}

func (r *ClassRepository) ListByAcademicYear(ctx context.Context, academicYearID uuid.UUID) ([]db.ListClassesByAcademicYearRow, error) {
	return r.queries.ListClassesByAcademicYear(ctx, academicYearID)
}

func (r *ClassRepository) ListCurrent(ctx context.Context) ([]db.ListCurrentClassesRow, error) {
	return r.queries.ListCurrentClasses(ctx)
}

func (r *ClassRepository) Update(ctx context.Context, params db.UpdateClassParams) (db.Class, error) {
	return r.queries.UpdateClass(ctx, params)
}

func (r *ClassRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteClass(ctx, id)
}

func (r *ClassRepository) AssignFormTeacher(ctx context.Context, classID uuid.UUID, teacherID uuid.UUID) (db.Class, error) {
	return r.queries.AssignFormTeacher(ctx, db.AssignFormTeacherParams{
		ID:            classID,
		FormTeacherID: pgtype.UUID{Bytes: teacherID, Valid: true},
	})
}

func (r *ClassRepository) AssignSubjectTeacher(ctx context.Context, params db.AssignSubjectTeacherToClassParams) error {
	return r.queries.AssignSubjectTeacherToClass(ctx, params)
}

func (r *ClassRepository) ListSubjectTeachers(ctx context.Context, classID uuid.UUID) ([]db.ListSubjectTeachersByClassRow, error) {
	return r.queries.ListSubjectTeachersByClass(ctx, classID)
}

func (r *ClassRepository) GetStudentCount(ctx context.Context, classID uuid.UUID) (int64, error) {
	count, err := r.queries.GetClassStudentCount(ctx, classID)
	return count, err
}

func (r *ClassRepository) EnrollStudent(ctx context.Context, classID uuid.UUID, studentID uuid.UUID) error {
	return r.queries.EnrollStudentInClass(ctx, db.EnrollStudentInClassParams{
		ClassID:   classID,
		StudentID: studentID,
	})
}

func (r *ClassRepository) UnenrollStudent(ctx context.Context, classID uuid.UUID, studentID uuid.UUID) error {
	return r.queries.UnenrollStudentFromClass(ctx, db.UnenrollStudentFromClassParams{
		ClassID:   classID,
		StudentID: studentID,
	})
}
