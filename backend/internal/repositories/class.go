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

// ListByGradeSection returns every class belonging to any grade in a
// grade_section, for a given academic year — the auto-generator's unit of
// work, since teachers/labs shared across these classes must be scheduled
// together to avoid conflicts.
func (r *ClassRepository) ListByGradeSection(ctx context.Context, gradeSectionID, academicYearID uuid.UUID) ([]db.Class, error) {
	return r.queries.ListClassesByGradeSection(ctx, db.ListClassesByGradeSectionParams{
		GradeSectionID: gradeSectionID,
		AcademicYearID: academicYearID,
	})
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

func (r *ClassRepository) AssignMonitors(ctx context.Context, classID uuid.UUID, girlMonitorID, boyMonitorID *uuid.UUID) (db.Class, error) {
	params := db.AssignClassMonitorsParams{ID: classID}
	if girlMonitorID != nil {
		params.GirlMonitorID = pgtype.UUID{Bytes: *girlMonitorID, Valid: true}
	}
	if boyMonitorID != nil {
		params.BoyMonitorID = pgtype.UUID{Bytes: *boyMonitorID, Valid: true}
	}
	return r.queries.AssignClassMonitors(ctx, params)
}

func (r *ClassRepository) AssignSubjectTeacher(ctx context.Context, params db.AssignSubjectTeacherToClassParams) error {
	return r.queries.AssignSubjectTeacherToClass(ctx, params)
}

func (r *ClassRepository) ListSubjectTeachers(ctx context.Context, classID uuid.UUID) ([]db.ListSubjectTeachersByClassRow, error) {
	return r.queries.ListSubjectTeachersByClass(ctx, classID)
}

// GetSubjectTeacher returns the teacher_profiles.id assigned to teach the
// given subject in the given class, or pgx.ErrNoRows if no one is.
func (r *ClassRepository) GetSubjectTeacher(ctx context.Context, classID, subjectID uuid.UUID) (uuid.UUID, error) {
	return r.queries.GetClassSubjectTeacher(ctx, db.GetClassSubjectTeacherParams{
		ClassID:   classID,
		SubjectID: subjectID,
	})
}

// IsTeacherAssignedToClass reports whether the teacher is the class's form
// teacher or teaches any subject in it.
func (r *ClassRepository) IsTeacherAssignedToClass(ctx context.Context, classID, teacherID uuid.UUID) (bool, error) {
	return r.queries.IsTeacherAssignedToClass(ctx, db.IsTeacherAssignedToClassParams{
		ID:            classID,
		FormTeacherID: pgtype.UUID{Bytes: teacherID, Valid: true},
		TeacherID:     teacherID,
	})
}

// IsTeacherAssignedToAnyStudentClass is the batched form of calling
// GetStudentCurrentClass + IsTeacherAssignedToClass once per student — one
// query answering whether teacherID is assigned to any of studentIDs'
// current-year classes.
func (r *ClassRepository) IsTeacherAssignedToAnyStudentClass(ctx context.Context, studentIDs []uuid.UUID, teacherID uuid.UUID) (bool, error) {
	return r.queries.IsTeacherAssignedToAnyStudentClass(ctx, db.IsTeacherAssignedToAnyStudentClassParams{
		StudentIds: studentIDs,
		TeacherID:  teacherID,
	})
}

func (r *ClassRepository) GetStudentCurrentClass(ctx context.Context, studentID uuid.UUID) (db.GetStudentCurrentClassRow, error) {
	return r.queries.GetStudentCurrentClass(ctx, studentID)
}

// ListEnrolledStudentIDs returns, of the given studentIDs, which are
// currently (this academic year) enrolled in exactly classID — the batched
// form of calling GetStudentCurrentClass once per student.
func (r *ClassRepository) ListEnrolledStudentIDs(ctx context.Context, classID uuid.UUID, studentIDs []uuid.UUID) ([]uuid.UUID, error) {
	return r.queries.ListStudentsEnrolledInCurrentClass(ctx, db.ListStudentsEnrolledInCurrentClassParams{
		ClassID:    classID,
		StudentIds: studentIDs,
	})
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
