package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type CurriculumRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewCurriculumRepository(pool *pgxpool.Pool) *CurriculumRepository {
	return &CurriculumRepository{pool: pool, queries: db.New(pool)}
}

func (r *CurriculumRepository) DuplicateLevel(
	ctx context.Context,
	sourceID uuid.UUID,
	params db.CreateLevelParams,
) (db.Level, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return db.Level{}, err
	}
	defer tx.Rollback(ctx)

	qtx := r.queries.WithTx(tx)

	level, err := qtx.CreateLevel(ctx, params)
	if err != nil {
		return db.Level{}, err
	}

	groups, err := qtx.ListSelectionGroupsByLevel(ctx, sourceID)
	if err != nil {
		return db.Level{}, err
	}

	for _, g := range groups {
		newGroup, err := qtx.CreateSelectionGroup(ctx, db.CreateSelectionGroupParams{
			LevelID:   level.ID,
			Label:     g.Label,
			MinSelect: g.MinSelect,
			MaxSelect: g.MaxSelect,
			SortOrder: g.SortOrder,
		})
		if err != nil {
			return db.Level{}, err
		}

		subjects, err := qtx.ListGroupSubjects(ctx, g.ID)
		if err != nil {
			return db.Level{}, err
		}

		for _, s := range subjects {
			_, err := qtx.AddGroupSubject(ctx, db.AddGroupSubjectParams{
				GroupID:          newGroup.ID,
				SubjectID:        s.SubjectID,
				MediumID:         s.MediumID,
				PrerequisiteNote: s.PrerequisiteNote,
				SortOrder:        s.SortOrder,
			})
			if err != nil {
				return db.Level{}, err
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return db.Level{}, err
	}

	return level, nil
}

func (r *CurriculumRepository) CreateMedium(ctx context.Context, name string) (db.Medium, error) {
	return r.queries.CreateMedium(ctx, name)
}

func (r *CurriculumRepository) GetMediumByID(ctx context.Context, id uuid.UUID) (db.Medium, error) {
	return r.queries.GetMediumByID(ctx, id)
}

func (r *CurriculumRepository) ListMediums(ctx context.Context) ([]db.Medium, error) {
	return r.queries.ListMediums(ctx)
}

func (r *CurriculumRepository) UpdateMedium(ctx context.Context, params db.UpdateMediumParams) (db.Medium, error) {
	return r.queries.UpdateMedium(ctx, params)
}

func (r *CurriculumRepository) DeleteMedium(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteMedium(ctx, id)
}

func (r *CurriculumRepository) CreateLevel(ctx context.Context, params db.CreateLevelParams) (db.Level, error) {
	return r.queries.CreateLevel(ctx, params)
}

func (r *CurriculumRepository) GetLevelByID(ctx context.Context, id uuid.UUID) (db.Level, error) {
	return r.queries.GetLevelByID(ctx, id)
}

func (r *CurriculumRepository) ListLevels(ctx context.Context) ([]db.Level, error) {
	return r.queries.ListLevels(ctx)
}

func (r *CurriculumRepository) ListLevelsByGrade(ctx context.Context, gradeID pgtype.UUID) ([]db.Level, error) {
	return r.queries.ListLevelsByGrade(ctx, gradeID)
}

func (r *CurriculumRepository) UpdateLevel(ctx context.Context, params db.UpdateLevelParams) (db.Level, error) {
	return r.queries.UpdateLevel(ctx, params)
}

func (r *CurriculumRepository) DeleteLevel(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteLevel(ctx, id)
}

func (r *CurriculumRepository) CreateSelectionGroup(ctx context.Context, params db.CreateSelectionGroupParams) (db.SelectionGroup, error) {
	return r.queries.CreateSelectionGroup(ctx, params)
}

func (r *CurriculumRepository) GetSelectionGroupByID(ctx context.Context, id uuid.UUID) (db.SelectionGroup, error) {
	return r.queries.GetSelectionGroupByID(ctx, id)
}

func (r *CurriculumRepository) ListSelectionGroupsByLevel(ctx context.Context, levelID uuid.UUID) ([]db.SelectionGroup, error) {
	return r.queries.ListSelectionGroupsByLevel(ctx, levelID)
}

func (r *CurriculumRepository) UpdateSelectionGroup(ctx context.Context, params db.UpdateSelectionGroupParams) (db.SelectionGroup, error) {
	return r.queries.UpdateSelectionGroup(ctx, params)
}

func (r *CurriculumRepository) DeleteSelectionGroup(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteSelectionGroup(ctx, id)
}

func (r *CurriculumRepository) CountGroupSubjects(ctx context.Context, groupID uuid.UUID) (int64, error) {
	return r.queries.CountGroupSubjects(ctx, groupID)
}

func (r *CurriculumRepository) AddGroupSubject(ctx context.Context, params db.AddGroupSubjectParams) (db.GroupSubject, error) {
	return r.queries.AddGroupSubject(ctx, params)
}

func (r *CurriculumRepository) ListGroupSubjects(ctx context.Context, groupID uuid.UUID) ([]db.ListGroupSubjectsRow, error) {
	return r.queries.ListGroupSubjects(ctx, groupID)
}

func (r *CurriculumRepository) RemoveGroupSubject(ctx context.Context, params db.RemoveGroupSubjectParams) error {
	return r.queries.RemoveGroupSubject(ctx, params)
}

func (r *CurriculumRepository) GetCurriculumTreeByLevel(ctx context.Context, levelID uuid.UUID) ([]db.GetCurriculumTreeByLevelRow, error) {
	return r.queries.GetCurriculumTreeByLevel(ctx, levelID)
}

func (r *CurriculumRepository) ListSelectionGroupsWithSubjectIDsByLevel(ctx context.Context, levelID uuid.UUID) ([]db.ListSelectionGroupsWithSubjectIDsByLevelRow, error) {
	return r.queries.ListSelectionGroupsWithSubjectIDsByLevel(ctx, levelID)
}
