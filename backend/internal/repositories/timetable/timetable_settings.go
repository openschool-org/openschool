package timetable

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type TimetableSettingsRepository struct {
	queries *db.Queries
}

func NewTimetableSettingsRepository(pool *pgxpool.Pool) *TimetableSettingsRepository {
	return &TimetableSettingsRepository{queries: db.New(pool)}
}

func (r *TimetableSettingsRepository) Upsert(ctx context.Context, params db.UpsertTimetableSettingsParams) (db.TimetableSetting, error) {
	return r.queries.UpsertTimetableSettings(ctx, params)
}

func (r *TimetableSettingsRepository) GetByYear(ctx context.Context, academicYearID uuid.UUID) (db.TimetableSetting, error) {
	return r.queries.GetTimetableSettingsByYear(ctx, academicYearID)
}
