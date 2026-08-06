package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type StudentPortfolioRepository struct {
	queries *db.Queries
}

func NewStudentPortfolioRepository(pool *pgxpool.Pool) *StudentPortfolioRepository {
	return &StudentPortfolioRepository{queries: db.New(pool)}
}

// Progress reports

func (r *StudentPortfolioRepository) CreateProgressReport(ctx context.Context, studentID, termID uuid.UUID, narrative string, writtenBy *uuid.UUID) (db.StudentProgressReport, error) {
	writtenByParam := pgtype.UUID{}
	if writtenBy != nil {
		writtenByParam = pgtype.UUID{Bytes: *writtenBy, Valid: true}
	}
	return r.queries.CreateProgressReport(ctx, db.CreateProgressReportParams{
		StudentID: studentID,
		TermID:    termID,
		Narrative: narrative,
		WrittenBy: writtenByParam,
	})
}

func (r *StudentPortfolioRepository) ListProgressReports(ctx context.Context, studentID uuid.UUID) ([]db.ListProgressReportsByStudentRow, error) {
	return r.queries.ListProgressReportsByStudent(ctx, studentID)
}

func (r *StudentPortfolioRepository) UpdateProgressReport(ctx context.Context, id uuid.UUID, narrative string) (db.StudentProgressReport, error) {
	return r.queries.UpdateProgressReport(ctx, db.UpdateProgressReportParams{ID: id, Narrative: narrative})
}

func (r *StudentPortfolioRepository) DeleteProgressReport(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteProgressReport(ctx, id)
}

// Activities

func (r *StudentPortfolioRepository) CreateActivity(ctx context.Context, studentID, academicYearID uuid.UUID, category, name, role, achievement string) (db.StudentActivity, error) {
	return r.queries.CreateStudentActivity(ctx, db.CreateStudentActivityParams{
		StudentID:      studentID,
		AcademicYearID: academicYearID,
		Category:       category,
		Name:           name,
		Role:           pgtype.Text{String: role, Valid: role != ""},
		Achievement:    pgtype.Text{String: achievement, Valid: achievement != ""},
	})
}

func (r *StudentPortfolioRepository) ListActivities(ctx context.Context, studentID uuid.UUID) ([]db.StudentActivity, error) {
	return r.queries.ListStudentActivitiesByStudent(ctx, studentID)
}

func (r *StudentPortfolioRepository) UpdateActivity(ctx context.Context, id uuid.UUID, category, name, role, achievement string) (db.StudentActivity, error) {
	return r.queries.UpdateStudentActivity(ctx, db.UpdateStudentActivityParams{
		ID:          id,
		Category:    category,
		Name:        name,
		Role:        pgtype.Text{String: role, Valid: role != ""},
		Achievement: pgtype.Text{String: achievement, Valid: achievement != ""},
	})
}

func (r *StudentPortfolioRepository) DeleteActivity(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteStudentActivity(ctx, id)
}

// Leadership roles

func (r *StudentPortfolioRepository) CreateLeadershipRole(ctx context.Context, studentID, academicYearID uuid.UUID, title, scope string) (db.StudentLeadershipRole, error) {
	return r.queries.CreateStudentLeadershipRole(ctx, db.CreateStudentLeadershipRoleParams{
		StudentID:      studentID,
		AcademicYearID: academicYearID,
		Title:          title,
		Scope:          pgtype.Text{String: scope, Valid: scope != ""},
	})
}

func (r *StudentPortfolioRepository) ListLeadershipRoles(ctx context.Context, studentID uuid.UUID) ([]db.StudentLeadershipRole, error) {
	return r.queries.ListStudentLeadershipRolesByStudent(ctx, studentID)
}

func (r *StudentPortfolioRepository) DeleteLeadershipRole(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteStudentLeadershipRole(ctx, id)
}

// Awards

func (r *StudentPortfolioRepository) CreateAward(ctx context.Context, studentID, academicYearID uuid.UUID, title, category string, awardedDate time.Time, description string) (db.StudentAward, error) {
	return r.queries.CreateStudentAward(ctx, db.CreateStudentAwardParams{
		StudentID:      studentID,
		AcademicYearID: academicYearID,
		Title:          title,
		Category:       pgtype.Text{String: category, Valid: category != ""},
		AwardedDate:    pgtype.Date{Time: awardedDate, Valid: true},
		Description:    pgtype.Text{String: description, Valid: description != ""},
	})
}

func (r *StudentPortfolioRepository) ListAwards(ctx context.Context, studentID uuid.UUID) ([]db.StudentAward, error) {
	return r.queries.ListStudentAwardsByStudent(ctx, studentID)
}

func (r *StudentPortfolioRepository) DeleteAward(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteStudentAward(ctx, id)
}

// Disciplinary records

func (r *StudentPortfolioRepository) CreateDisciplinaryRecord(ctx context.Context, studentID, academicYearID uuid.UUID, incidentDate time.Time, description, actionTaken, severity string, recordedBy *uuid.UUID) (db.StudentDisciplinaryRecord, error) {
	recordedByParam := pgtype.UUID{}
	if recordedBy != nil {
		recordedByParam = pgtype.UUID{Bytes: *recordedBy, Valid: true}
	}
	return r.queries.CreateDisciplinaryRecord(ctx, db.CreateDisciplinaryRecordParams{
		StudentID:      studentID,
		AcademicYearID: academicYearID,
		IncidentDate:   pgtype.Date{Time: incidentDate, Valid: true},
		Description:    description,
		ActionTaken:    pgtype.Text{String: actionTaken, Valid: actionTaken != ""},
		Severity:       severity,
		RecordedBy:     recordedByParam,
	})
}

func (r *StudentPortfolioRepository) ListDisciplinaryRecords(ctx context.Context, studentID uuid.UUID) ([]db.StudentDisciplinaryRecord, error) {
	return r.queries.ListDisciplinaryRecordsByStudent(ctx, studentID)
}

func (r *StudentPortfolioRepository) DeleteDisciplinaryRecord(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteDisciplinaryRecord(ctx, id)
}
