package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type SocietyRepository struct {
	queries *db.Queries
}

func NewSocietyRepository(pool *pgxpool.Pool) *SocietyRepository {
	return &SocietyRepository{queries: db.New(pool)}
}

func (r *SocietyRepository) Create(ctx context.Context, params db.CreateSocietyParams) (db.Society, error) {
	return r.queries.CreateSociety(ctx, params)
}

func (r *SocietyRepository) Update(ctx context.Context, params db.UpdateSocietyParams) (db.Society, error) {
	return r.queries.UpdateSociety(ctx, params)
}

func (r *SocietyRepository) Delete(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteSociety(ctx, id)
}

func (r *SocietyRepository) GetByID(ctx context.Context, id uuid.UUID) (db.Society, error) {
	return r.queries.GetSocietyByID(ctx, id)
}

func (r *SocietyRepository) GetForTeacher(ctx context.Context, teacherID, academicYearID uuid.UUID) (db.Society, error) {
	return r.queries.GetSocietyForTeacher(ctx, db.GetSocietyForTeacherParams{
		TeacherInChargeID: teacherID,
		AcademicYearID:    academicYearID,
	})
}

func (r *SocietyRepository) ListByYear(ctx context.Context, academicYearID uuid.UUID) ([]db.ListSocietiesByYearRow, error) {
	return r.queries.ListSocietiesByYear(ctx, academicYearID)
}

func (r *SocietyRepository) ListYears(ctx context.Context) ([]db.ListSocietyYearsRow, error) {
	return r.queries.ListSocietyYears(ctx)
}

func (r *SocietyRepository) UpsertMember(ctx context.Context, params db.UpsertSocietyMemberParams) (db.SocietyMember, error) {
	return r.queries.UpsertSocietyMember(ctx, params)
}

func (r *SocietyRepository) ListMembersBySociety(ctx context.Context, societyID uuid.UUID) ([]db.ListSocietyMembersBySocietyRow, error) {
	return r.queries.ListSocietyMembersBySociety(ctx, societyID)
}

func (r *SocietyRepository) RemoveMember(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.RemoveSocietyMember(ctx, id)
}

func (r *SocietyRepository) ListMembershipsByStudent(ctx context.Context, studentID uuid.UUID) ([]db.ListSocietyMembershipsByStudentRow, error) {
	return r.queries.ListSocietyMembershipsByStudent(ctx, studentID)
}
