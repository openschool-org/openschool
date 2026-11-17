package curriculum

import (
	"context"
	"errors"
	"fmt"

	"github.com/openschool-org/openschool/internal/platform/listx"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/openschool-org/openschool/db/sqlc"
)

type mediumRepository struct{ queries *db.Queries }

type presetRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func newPresetRepository(pool *pgxpool.Pool) *presetRepository {
	return &presetRepository{pool: pool, queries: db.New(pool)}
}

func (r *presetRepository) listPresetGrades(ctx context.Context) ([]presetGrade, error) {
	rows, err := r.queries.ListGrades(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]presetGrade, len(rows))
	for i, row := range rows {
		out[i] = presetGrade{ID: row.ID, Name: row.Name}
	}
	return out, nil
}
func (r *presetRepository) listPresetSubjects(ctx context.Context) ([]presetSubjectRow, error) {
	rows, err := r.queries.ListSubjects(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]presetSubjectRow, len(rows))
	for i, row := range rows {
		out[i] = presetSubjectRow{ID: row.ID, Code: row.Code}
	}
	return out, nil
}
func (r *presetRepository) withPresetTx(ctx context.Context, commit bool, fn func(presetTx) error) error {
	if !commit {
		return fn(&presetTxRepository{queries: r.queries})
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)
	if err := fn(&presetTxRepository{queries: r.queries.WithTx(tx)}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

type presetTxRepository struct{ queries *db.Queries }

func (r *presetTxRepository) createSubject(ctx context.Context, v presetSubject) (presetSubjectRow, error) {
	var maxMarks pgtype.Numeric
	if err := maxMarks.Scan("100.00"); err != nil {
		return presetSubjectRow{}, fmt.Errorf("create default subject mark limit: %w", err)
	}
	row, err := r.queries.CreateSubject(ctx, db.CreateSubjectParams{Name: v.Name, Code: v.Code, Type: curriculumOptionalText(v.Type), MaxMarks: maxMarks})
	return presetSubjectRow{ID: row.ID, Code: row.Code}, err
}
func (r *presetTxRepository) listLevels(ctx context.Context) ([]Level, error) {
	return listx.Map(func() ([]db.Level, error) { return r.queries.ListLevels(ctx) }, mapLevel)
}
func (r *presetTxRepository) createLevel(ctx context.Context, label string, gradeID uuid.UUID, sortOrder int32) (Level, error) {
	row, err := r.queries.CreateLevel(ctx, db.CreateLevelParams{Label: label, GradeID: pgtype.UUID{Bytes: gradeID, Valid: true}, SortOrder: sortOrder})
	return mapLevel(row), err
}
func (r *presetTxRepository) listGroups(ctx context.Context, levelID uuid.UUID) ([]SelectionGroup, error) {
	return listx.Map(func() ([]db.SelectionGroup, error) { return r.queries.ListSelectionGroupsByLevel(ctx, levelID) }, mapGroup)
}
func (r *presetTxRepository) createGroup(ctx context.Context, levelID uuid.UUID, v presetGroup, sortOrder int32) (SelectionGroup, error) {
	row, err := r.queries.CreateSelectionGroup(ctx, db.CreateSelectionGroupParams{LevelID: levelID, Label: v.Label, MinSelect: v.MinSelect, MaxSelect: v.MaxSelect, SortOrder: sortOrder})
	return mapGroup(row), err
}
func (r *presetTxRepository) listSubjects(ctx context.Context, groupID uuid.UUID) ([]GroupSubject, error) {
	rows, err := r.queries.ListGroupSubjects(ctx, groupID)
	if err != nil {
		return nil, err
	}
	out := make([]GroupSubject, len(rows))
	for i, row := range rows {
		out[i] = GroupSubject{SubjectID: row.SubjectID.String(), SubjectCode: row.SubjectCode}
	}
	return out, nil
}
func (r *presetTxRepository) addPresetSubject(ctx context.Context, groupID, subjectID uuid.UUID, sortOrder int32) error {
	_, err := r.queries.AddGroupSubject(ctx, db.AddGroupSubjectParams{GroupID: groupID, SubjectID: subjectID, SortOrder: sortOrder})
	return err
}

type levelRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func newLevelRepository(pool *pgxpool.Pool) *levelRepository {
	return &levelRepository{pool: pool, queries: db.New(pool)}
}

func mapLevel(row db.Level) Level {
	return Level{ID: row.ID.String(), Label: row.Label, GradeID: curriculumUUIDString(row.GradeID), SortOrder: row.SortOrder, CreatedAt: row.CreatedAt.Time.String()}
}

func mapGroup(row db.SelectionGroup) SelectionGroup {
	return SelectionGroup{ID: row.ID.String(), LevelID: row.LevelID.String(), Label: row.Label, MinSelect: row.MinSelect, MaxSelect: row.MaxSelect, SortOrder: row.SortOrder, CreatedAt: row.CreatedAt.Time.String()}
}

func curriculumUUIDString(value pgtype.UUID) *string {
	if !value.Valid {
		return nil
	}
	result := uuid.UUID(value.Bytes).String()
	return &result
}

func curriculumTextString(value pgtype.Text) *string {
	if !value.Valid {
		return nil
	}
	result := value.String
	return &result
}

func (r *levelRepository) createLevel(ctx context.Context, request levelRequest) (Level, error) {
	gradeID, err := optionalGradeID(request.GradeID)
	if err != nil {
		return Level{}, err
	}
	row, err := r.queries.CreateLevel(ctx, db.CreateLevelParams{Label: request.Label, GradeID: gradeID, SortOrder: request.SortOrder})
	return mapLevel(row), err
}

func (r *levelRepository) getLevel(ctx context.Context, id uuid.UUID) (Level, error) {
	row, err := r.queries.GetLevelByID(ctx, id)
	return mapLevel(row), err
}
func (r *levelRepository) listLevels(ctx context.Context) ([]Level, error) {
	return listx.Map(func() ([]db.Level, error) { return r.queries.ListLevels(ctx) }, mapLevel)
}
func (r *levelRepository) listLevelsByGrade(ctx context.Context, id uuid.UUID) ([]Level, error) {
	return listx.Map(func() ([]db.Level, error) {
		return r.queries.ListLevelsByGrade(ctx, pgtype.UUID{Bytes: id, Valid: true})
	}, mapLevel)
}
func (r *levelRepository) updateLevel(ctx context.Context, id uuid.UUID, request levelRequest) (Level, error) {
	gradeID, err := optionalGradeID(request.GradeID)
	if err != nil {
		return Level{}, err
	}
	row, err := r.queries.UpdateLevel(ctx, db.UpdateLevelParams{ID: id, Label: request.Label, GradeID: gradeID, SortOrder: request.SortOrder})
	return mapLevel(row), err
}

func (r *levelRepository) duplicateLevel(ctx context.Context, source uuid.UUID, request levelRequest) (Level, error) {
	gradeID, err := optionalGradeID(request.GradeID)
	if err != nil {
		return Level{}, err
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return Level{}, err
	}
	defer tx.Rollback(ctx)
	queries := r.queries.WithTx(tx)
	level, err := queries.CreateLevel(ctx, db.CreateLevelParams{Label: request.Label, GradeID: gradeID, SortOrder: request.SortOrder})
	if err != nil {
		return Level{}, err
	}
	groups, err := queries.ListSelectionGroupsByLevel(ctx, source)
	if err != nil {
		return Level{}, err
	}
	for _, group := range groups {
		newGroup, err := queries.CreateSelectionGroup(ctx, db.CreateSelectionGroupParams{LevelID: level.ID, Label: group.Label, MinSelect: group.MinSelect, MaxSelect: group.MaxSelect, SortOrder: group.SortOrder})
		if err != nil {
			return Level{}, err
		}
		subjects, err := queries.ListGroupSubjects(ctx, group.ID)
		if err != nil {
			return Level{}, err
		}
		for _, subject := range subjects {
			if _, err := queries.AddGroupSubject(ctx, db.AddGroupSubjectParams{GroupID: newGroup.ID, SubjectID: subject.SubjectID, MediumID: subject.MediumID, PrerequisiteNote: subject.PrerequisiteNote, SortOrder: subject.SortOrder}); err != nil {
				return Level{}, err
			}
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return Level{}, err
	}
	return mapLevel(level), nil
}

func (r *levelRepository) deleteLevel(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteLevel(ctx, id)
}
func (r *levelRepository) levelExists(ctx context.Context, id uuid.UUID) (bool, error) {
	_, err := r.queries.GetLevelByID(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}
func (r *levelRepository) createGroup(ctx context.Context, levelID uuid.UUID, request groupRequest) (SelectionGroup, error) {
	row, err := r.queries.CreateSelectionGroup(ctx, db.CreateSelectionGroupParams{LevelID: levelID, Label: request.Label, MinSelect: request.MinSelect, MaxSelect: request.MaxSelect, SortOrder: request.SortOrder})
	return mapGroup(row), err
}
func (r *levelRepository) getGroup(ctx context.Context, id uuid.UUID) (SelectionGroup, error) {
	row, err := r.queries.GetSelectionGroupByID(ctx, id)
	return mapGroup(row), err
}
func (r *levelRepository) listGroups(ctx context.Context, id uuid.UUID) ([]SelectionGroup, error) {
	return listx.Map(func() ([]db.SelectionGroup, error) { return r.queries.ListSelectionGroupsByLevel(ctx, id) }, mapGroup)
}
func (r *levelRepository) updateGroup(ctx context.Context, id uuid.UUID, request groupRequest) (SelectionGroup, error) {
	row, err := r.queries.UpdateSelectionGroup(ctx, db.UpdateSelectionGroupParams{ID: id, Label: request.Label, MinSelect: request.MinSelect, MaxSelect: request.MaxSelect, SortOrder: request.SortOrder})
	return mapGroup(row), err
}
func (r *levelRepository) deleteGroup(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteSelectionGroup(ctx, id)
}
func (r *levelRepository) groupExists(ctx context.Context, id uuid.UUID) (bool, error) {
	_, err := r.queries.GetSelectionGroupByID(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}
func (r *levelRepository) addSubject(ctx context.Context, groupID uuid.UUID, request groupSubjectRequest) error {
	subjectID, _ := uuid.Parse(request.SubjectID)
	var mediumID pgtype.UUID
	if request.MediumID != "" {
		parsed, _ := uuid.Parse(request.MediumID)
		mediumID = pgtype.UUID{Bytes: parsed, Valid: true}
	}
	_, err := r.queries.AddGroupSubject(ctx, db.AddGroupSubjectParams{GroupID: groupID, SubjectID: subjectID, MediumID: mediumID, PrerequisiteNote: curriculumOptionalText(request.PrerequisiteNote), SortOrder: request.SortOrder})
	return err
}
func curriculumOptionalText(value string) pgtype.Text {
	if value == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: value, Valid: true}
}
func (r *levelRepository) listSubjects(ctx context.Context, groupID uuid.UUID) ([]GroupSubject, error) {
	rows, err := r.queries.ListGroupSubjects(ctx, groupID)
	if err != nil {
		return nil, err
	}
	result := make([]GroupSubject, len(rows))
	for i, row := range rows {
		result[i] = GroupSubject{SubjectID: row.SubjectID.String(), SubjectName: row.SubjectName, SubjectCode: row.SubjectCode, SubjectType: curriculumTextString(row.SubjectType), MediumID: curriculumUUIDString(row.MediumID), MediumName: curriculumTextString(row.MediumName), PrerequisiteNote: curriculumTextString(row.PrerequisiteNote), SortOrder: row.SortOrder}
	}
	return result, nil
}
func (r *levelRepository) removeSubject(ctx context.Context, groupID, subjectID uuid.UUID) error {
	return r.queries.RemoveGroupSubject(ctx, db.RemoveGroupSubjectParams{GroupID: groupID, SubjectID: subjectID})
}
func (r *levelRepository) tree(ctx context.Context, id uuid.UUID) (CurriculumTree, error) {
	level, err := r.queries.GetLevelByID(ctx, id)
	if err != nil {
		return CurriculumTree{}, errLevelNotFound
	}
	rows, err := r.queries.GetCurriculumTreeByLevel(ctx, id)
	if err != nil {
		return CurriculumTree{}, err
	}
	tree := CurriculumTree{Level: mapLevel(level), Groups: []CurriculumGroup{}}
	positions := map[uuid.UUID]int{}
	for _, row := range rows {
		index, exists := positions[row.GroupID]
		if !exists {
			tree.Groups = append(tree.Groups, CurriculumGroup{ID: row.GroupID.String(), Label: row.GroupLabel, MinSelect: row.MinSelect, MaxSelect: row.MaxSelect, SortOrder: row.GroupSortOrder, Subjects: []GroupSubject{}})
			index = len(tree.Groups) - 1
			positions[row.GroupID] = index
		}
		if !row.SubjectID.Valid {
			continue
		}
		tree.Groups[index].Subjects = append(tree.Groups[index].Subjects, GroupSubject{SubjectID: uuid.UUID(row.SubjectID.Bytes).String(), SubjectName: row.SubjectName.String, SubjectCode: row.SubjectCode.String, SubjectType: curriculumTextString(row.SubjectType), MediumID: curriculumUUIDString(row.MediumID), MediumName: curriculumTextString(row.MediumName), PrerequisiteNote: curriculumTextString(row.PrerequisiteNote), SortOrder: row.SubjectSortOrder.Int32})
	}
	return tree, nil
}

func newMediumRepository(pool *pgxpool.Pool) *mediumRepository {
	return &mediumRepository{queries: db.New(pool)}
}

func (r *mediumRepository) createMedium(ctx context.Context, name string) (Medium, error) {
	row, err := r.queries.CreateMedium(ctx, name)
	return mapMedium(row), err
}

func (r *mediumRepository) listMediums(ctx context.Context) ([]Medium, error) {
	return listx.Map(func() ([]db.Medium, error) { return r.queries.ListMediums(ctx) }, mapMedium)
}

func (r *mediumRepository) updateMedium(ctx context.Context, id uuid.UUID, name string) (Medium, error) {
	row, err := r.queries.UpdateMedium(ctx, db.UpdateMediumParams{ID: id, Name: name})
	return mapMedium(row), err
}

func (r *mediumRepository) deleteMedium(ctx context.Context, id uuid.UUID) (int64, error) {
	return r.queries.DeleteMedium(ctx, id)
}

func (r *mediumRepository) mediumExists(ctx context.Context, id uuid.UUID) (bool, error) {
	_, err := r.queries.GetMediumByID(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func mapMedium(row db.Medium) Medium {
	return Medium{ID: row.ID.String(), Name: row.Name, CreatedAt: row.CreatedAt.Time.String()}
}
