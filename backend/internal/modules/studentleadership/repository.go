package studentleadership

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type Repository struct{ queries *db.Queries }

func NewRepository(pool *pgxpool.Pool) *Repository { return &Repository{queries: db.New(pool)} }

func mapPrefect(value db.Prefect) Prefect {
	return Prefect{ID: value.ID, AcademicYearID: value.AcademicYearID, StudentID: value.StudentID, Rank: value.Rank, CreatedAt: value.CreatedAt}
}

func (r *Repository) upsertPrefect(ctx context.Context, yearID, studentID uuid.UUID, rank string) (Prefect, error) {
	value, err := r.queries.UpsertPrefect(ctx, db.UpsertPrefectParams{AcademicYearID: yearID, StudentID: studentID, Rank: rank})
	return mapPrefect(value), err
}

func (r *Repository) listPrefectsByYear(ctx context.Context, yearID uuid.UUID) ([]PrefectListItem, error) {
	rows, err := r.queries.ListPrefectsByYear(ctx, yearID)
	if err != nil {
		return nil, err
	}
	result := make([]PrefectListItem, len(rows))
	for i, value := range rows {
		result[i] = PrefectListItem{Prefect: Prefect{ID: value.ID, AcademicYearID: value.AcademicYearID, StudentID: value.StudentID, Rank: value.Rank, CreatedAt: value.CreatedAt}, StudentName: value.StudentName, StudentIndex: value.StudentIndex, GradeName: value.GradeName}
	}
	return result, nil
}

func (r *Repository) listPrefectsByStudent(ctx context.Context, studentID uuid.UUID) ([]PrefectAppointment, error) {
	rows, err := r.queries.ListPrefectAppointmentsByStudent(ctx, studentID)
	if err != nil {
		return nil, err
	}
	result := make([]PrefectAppointment, len(rows))
	for i, value := range rows {
		result[i] = PrefectAppointment{ID: value.ID, AcademicYearID: value.AcademicYearID, Rank: value.Rank, CreatedAt: value.CreatedAt, AcademicYearLabel: value.AcademicYearLabel}
	}
	return result, nil
}

func (r *Repository) listPrefectYears(ctx context.Context) ([]AcademicYearOption, error) {
	rows, err := r.queries.ListPrefectYears(ctx)
	if err != nil {
		return nil, err
	}
	return mapPrefectYears(rows), nil
}

func mapPrefectYears(rows []db.ListPrefectYearsRow) []AcademicYearOption {
	result := make([]AcademicYearOption, len(rows))
	for i, value := range rows {
		result[i] = AcademicYearOption{ID: value.ID, Label: value.Label, StartDate: value.StartDate}
	}
	return result
}

func (r *Repository) deletePrefect(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeletePrefect(ctx, id)
}

func mapSociety(value db.Society) Society {
	return Society{ID: value.ID, Name: value.Name, TeacherInChargeID: value.TeacherInChargeID, AcademicYearID: value.AcademicYearID, CreatedAt: value.CreatedAt}
}

func (r *Repository) createSociety(ctx context.Context, name string, teacherID, yearID uuid.UUID) (Society, error) {
	value, err := r.queries.CreateSociety(ctx, db.CreateSocietyParams{Name: name, TeacherInChargeID: teacherID, AcademicYearID: yearID})
	return mapSociety(value), err
}

func (r *Repository) updateSociety(ctx context.Context, id uuid.UUID, name string, teacherID uuid.UUID) (Society, error) {
	value, err := r.queries.UpdateSociety(ctx, db.UpdateSocietyParams{ID: id, Name: name, TeacherInChargeID: teacherID})
	return mapSociety(value), err
}

func (r *Repository) deleteSociety(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteSociety(ctx, id)
}

func (r *Repository) getSociety(ctx context.Context, id uuid.UUID) (Society, error) {
	value, err := r.queries.GetSocietyByID(ctx, id)
	return mapSociety(value), err
}

func (r *Repository) getSocietyForTeacher(ctx context.Context, teacherID, yearID uuid.UUID) (Society, error) {
	value, err := r.queries.GetSocietyForTeacher(ctx, db.GetSocietyForTeacherParams{TeacherInChargeID: teacherID, AcademicYearID: yearID})
	return mapSociety(value), err
}

func (r *Repository) listSocietiesByYear(ctx context.Context, yearID uuid.UUID) ([]SocietyListItem, error) {
	rows, err := r.queries.ListSocietiesByYear(ctx, yearID)
	if err != nil {
		return nil, err
	}
	result := make([]SocietyListItem, len(rows))
	for i, value := range rows {
		result[i] = SocietyListItem{Society: Society{ID: value.ID, Name: value.Name, TeacherInChargeID: value.TeacherInChargeID, AcademicYearID: value.AcademicYearID, CreatedAt: value.CreatedAt}, TeacherName: value.TeacherName, MemberCount: value.MemberCount}
	}
	return result, nil
}

func (r *Repository) listSocietyYears(ctx context.Context) ([]AcademicYearOption, error) {
	rows, err := r.queries.ListSocietyYears(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]AcademicYearOption, len(rows))
	for i, value := range rows {
		result[i] = AcademicYearOption{ID: value.ID, Label: value.Label, StartDate: value.StartDate}
	}
	return result, nil
}

func mapSocietyMember(value db.SocietyMember) SocietyMember {
	return SocietyMember{ID: value.ID, SocietyID: value.SocietyID, StudentID: value.StudentID, Role: value.Role, AcademicYearID: value.AcademicYearID, CreatedAt: value.CreatedAt, LeftAt: value.LeftAt, LeftReason: value.LeftReason}
}

func (r *Repository) upsertSocietyMember(ctx context.Context, societyID, studentID uuid.UUID, role string, yearID uuid.UUID) (SocietyMember, error) {
	value, err := r.queries.UpsertSocietyMember(ctx, db.UpsertSocietyMemberParams{SocietyID: societyID, StudentID: studentID, Role: role, AcademicYearID: yearID})
	return mapSocietyMember(value), err
}

func (r *Repository) listSocietyMembers(ctx context.Context, societyID uuid.UUID) ([]SocietyMemberListItem, error) {
	rows, err := r.queries.ListSocietyMembersBySociety(ctx, societyID)
	if err != nil {
		return nil, err
	}
	result := make([]SocietyMemberListItem, len(rows))
	for i, value := range rows {
		result[i] = SocietyMemberListItem{SocietyMember: SocietyMember{ID: value.ID, SocietyID: value.SocietyID, StudentID: value.StudentID, Role: value.Role, AcademicYearID: value.AcademicYearID, CreatedAt: value.CreatedAt, LeftAt: value.LeftAt, LeftReason: value.LeftReason}, StudentName: value.StudentName, StudentIndex: value.StudentIndex, GradeName: value.GradeName}
	}
	return result, nil
}

func (r *Repository) deactivateSocietyMember(ctx context.Context, societyID, memberID uuid.UUID, reason string) (int64, error) {
	return r.queries.DeactivateSocietyMember(ctx, db.DeactivateSocietyMemberParams{ID: memberID, SocietyID: societyID, Reason: pgtype.Text{String: reason, Valid: reason != ""}})
}

func (r *Repository) listSocietyMembershipsByStudent(ctx context.Context, studentID uuid.UUID) ([]SocietyMembership, error) {
	rows, err := r.queries.ListSocietyMembershipsByStudent(ctx, studentID)
	if err != nil {
		return nil, err
	}
	result := make([]SocietyMembership, len(rows))
	for i, value := range rows {
		result[i] = SocietyMembership{ID: value.ID, SocietyID: value.SocietyID, Role: value.Role, AcademicYearID: value.AcademicYearID, CreatedAt: value.CreatedAt, LeftAt: value.LeftAt, SocietyName: value.SocietyName, AcademicYearLabel: value.AcademicYearLabel}
	}
	return result, nil
}

func (r *Repository) teacherIDByUser(ctx context.Context, userID uuid.UUID) (uuid.UUID, error) {
	teacher, err := r.queries.GetTeacherByUserID(ctx, userID)
	return teacher.ID, err
}
