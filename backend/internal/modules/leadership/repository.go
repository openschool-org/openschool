package leadership

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type Repository struct{ queries *db.Queries }

func NewRepository(pool *pgxpool.Pool) *Repository { return &Repository{queries: db.New(pool)} }

func mapPosition(value db.TeacherPosition) Position {
	return Position{ID: value.ID, TeacherID: value.TeacherID, Position: value.Position, NotifyWholeSchool: value.NotifyWholeSchool, ScopeNote: value.ScopeNote, CreatedAt: value.CreatedAt}
}

func (r *Repository) upsertPrincipal(ctx context.Context, teacherID uuid.UUID) (Position, error) {
	value, err := r.queries.UpsertPrincipal(ctx, teacherID)
	return mapPosition(value), err
}

func (r *Repository) upsertVicePrincipal(ctx context.Context, teacherID uuid.UUID, notifyWholeSchool bool) (Position, error) {
	value, err := r.queries.UpsertVicePrincipal(ctx, db.UpsertVicePrincipalParams{TeacherID: teacherID, NotifyWholeSchool: notifyWholeSchool, ScopeNote: pgtype.Text{}})
	return mapPosition(value), err
}

func (r *Repository) replaceVicePrincipalScopes(ctx context.Context, positionID uuid.UUID, gradeIDs []uuid.UUID) error {
	if err := r.queries.DeleteVicePrincipalScopes(ctx, positionID); err != nil {
		return err
	}
	for _, gradeID := range gradeIDs {
		if err := r.queries.InsertVicePrincipalScope(ctx, db.InsertVicePrincipalScopeParams{PositionID: positionID, GradeID: gradeID}); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) listPositions(ctx context.Context) ([]PositionListItem, error) {
	rows, err := r.queries.ListTeacherPositions(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]PositionListItem, len(rows))
	for i, value := range rows {
		result[i] = PositionListItem{Position: Position{ID: value.ID, TeacherID: value.TeacherID, Position: value.Position, NotifyWholeSchool: value.NotifyWholeSchool, ScopeNote: value.ScopeNote, CreatedAt: value.CreatedAt}, TeacherName: value.TeacherName}
	}
	return result, nil
}

func (r *Repository) getPositionForTeacher(ctx context.Context, teacherID uuid.UUID) (Position, error) {
	value, err := r.queries.GetTeacherPosition(ctx, teacherID)
	return mapPosition(value), err
}

func (r *Repository) listVicePrincipalScopeGrades(ctx context.Context, positionID uuid.UUID) ([]scopeGrade, error) {
	rows, err := r.queries.ListVicePrincipalScopeGrades(ctx, positionID)
	if err != nil {
		return nil, err
	}
	result := make([]scopeGrade, len(rows))
	for i, value := range rows {
		result[i] = scopeGrade{ID: value.ID, Name: value.Name}
	}
	return result, nil
}

func (r *Repository) deletePosition(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteTeacherPosition(ctx, id)
}

func (r *Repository) deletePositionByTeacherAndType(ctx context.Context, teacherID uuid.UUID, position string) error {
	return r.queries.DeleteTeacherPositionByTeacherAndType(ctx, db.DeleteTeacherPositionByTeacherAndTypeParams{TeacherID: teacherID, Position: position})
}

func (r *Repository) isPrincipal(ctx context.Context, teacherID uuid.UUID) (bool, error) {
	return r.queries.IsPrincipal(ctx, teacherID)
}

func (r *Repository) isFormTeacher(ctx context.Context, teacherID, academicYearID uuid.UUID) (bool, error) {
	return r.queries.IsFormTeacherOfAnyClass(ctx, db.IsFormTeacherOfAnyClassParams{FormTeacherID: pgtype.UUID{Bytes: teacherID, Valid: true}, AcademicYearID: academicYearID})
}

func (r *Repository) isSubjectTeacher(ctx context.Context, teacherID, academicYearID uuid.UUID) (bool, error) {
	return r.queries.IsSubjectTeacherOfAnyClass(ctx, db.IsSubjectTeacherOfAnyClassParams{TeacherID: teacherID, AcademicYearID: academicYearID})
}

func (r *Repository) leadershipOverviewCounts(ctx context.Context, gradeIDs []uuid.UUID) (overviewCounts, error) {
	value, err := r.queries.LeadershipOverviewCounts(ctx, gradeIDs)
	return overviewCounts{ClassCount: value.ClassCount, StudentCount: value.StudentCount, SessionsMarkedToday: value.SessionsMarkedToday}, err
}

func (r *Repository) leadershipOverviewGradeNames(ctx context.Context, gradeIDs []uuid.UUID) ([]string, error) {
	return r.queries.LeadershipOverviewGradeNames(ctx, gradeIDs)
}

func mapSectionHead(value db.SectionHead) SectionHead {
	return SectionHead{ID: value.ID, AcademicYearID: value.AcademicYearID, GradeID: value.GradeID, StreamID: value.StreamID, TeacherID: value.TeacherID, CreatedAt: value.CreatedAt}
}

func (r *Repository) upsertGradeSectionHead(ctx context.Context, yearID, gradeID, teacherID uuid.UUID) (SectionHead, error) {
	value, err := r.queries.UpsertGradeSectionHead(ctx, db.UpsertGradeSectionHeadParams{AcademicYearID: yearID, GradeID: gradeID, TeacherID: teacherID})
	return mapSectionHead(value), err
}

func (r *Repository) upsertStreamSectionHead(ctx context.Context, yearID, gradeID, streamID, teacherID uuid.UUID) (SectionHead, error) {
	value, err := r.queries.UpsertStreamSectionHead(ctx, db.UpsertStreamSectionHeadParams{AcademicYearID: yearID, GradeID: gradeID, StreamID: pgtype.UUID{Bytes: streamID, Valid: true}, TeacherID: teacherID})
	return mapSectionHead(value), err
}

func (r *Repository) listSectionHeads(ctx context.Context, yearID uuid.UUID) ([]SectionHeadListItem, error) {
	rows, err := r.queries.ListSectionHeadsByYear(ctx, yearID)
	if err != nil {
		return nil, err
	}
	result := make([]SectionHeadListItem, len(rows))
	for i, value := range rows {
		result[i] = SectionHeadListItem{SectionHead: SectionHead{ID: value.ID, AcademicYearID: value.AcademicYearID, GradeID: value.GradeID, StreamID: value.StreamID, TeacherID: value.TeacherID, CreatedAt: value.CreatedAt}, GradeName: value.GradeName, StreamName: value.StreamName, TeacherName: value.TeacherName}
	}
	return result, nil
}

func (r *Repository) deleteSectionHead(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteSectionHead(ctx, id)
}

func (r *Repository) listGradeIDsHeadedByTeacher(ctx context.Context, teacherID, yearID uuid.UUID) ([]uuid.UUID, error) {
	return r.queries.ListGradeIDsHeadedByTeacher(ctx, db.ListGradeIDsHeadedByTeacherParams{TeacherID: teacherID, AcademicYearID: yearID})
}

func (r *Repository) teacherClassAccess(ctx context.Context, userID, classID uuid.UUID) (classAccess, error) {
	row, err := r.queries.TeacherClassAccess(ctx, db.TeacherClassAccessParams{UserID: userID, ClassID: classID})
	return classAccess{TeacherID: row.TeacherID, GradeID: row.GradeID, AcademicYearID: row.AcademicYearID, Assigned: row.Assigned}, err
}

func (r *Repository) currentClassOfStudent(ctx context.Context, studentID uuid.UUID) (uuid.UUID, error) {
	return r.queries.CurrentClassOfStudent(ctx, studentID)
}
