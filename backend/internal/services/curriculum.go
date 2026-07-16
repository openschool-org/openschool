package services

import (
	"context"
	"errors"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

var (
	ErrMediumNotFound         = errors.New("medium not found")
	ErrMediumInUse            = errors.New("medium is in use and cannot be deleted")
	ErrLevelNotFound          = errors.New("level not found")
	ErrLevelInUse             = errors.New("level has enrolled students and cannot be deleted")
	ErrSelectionGroupNotFound = errors.New("selection group not found")
	ErrSelectionGroupInUse    = errors.New("selection group has enrolled students and cannot be deleted")
	ErrInvalidSelectRange     = errors.New("max_select must be greater than or equal to min_select")
)

type CurriculumService struct {
	repo *repositories.CurriculumRepository
}

func NewCurriculumService(repo *repositories.CurriculumRepository) *CurriculumService {
	return &CurriculumService{repo: repo}
}

// ── mediums ─────────────────────────────────────────────────────────────────

func (s *CurriculumService) CreateMedium(ctx context.Context, req models.CreateMediumRequest) (db.Medium, error) {
	return s.repo.CreateMedium(ctx, req.Name)
}

func (s *CurriculumService) GetMedium(ctx context.Context, id uuid.UUID) (db.Medium, error) {
	return s.repo.GetMediumByID(ctx, id)
}

func (s *CurriculumService) ListMediums(ctx context.Context) ([]db.Medium, error) {
	return s.repo.ListMediums(ctx)
}

func (s *CurriculumService) UpdateMedium(ctx context.Context, id uuid.UUID, req models.UpdateMediumRequest) (db.Medium, error) {
	return s.repo.UpdateMedium(ctx, db.UpdateMediumParams{ID: id, Name: req.Name})
}

func (s *CurriculumService) DeleteMedium(ctx context.Context, id uuid.UUID) error {
	rows, err := s.repo.DeleteMedium(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		if _, err := s.repo.GetMediumByID(ctx, id); err != nil {
			return ErrMediumNotFound
		}
		return ErrMediumInUse
	}
	return nil
}

// ── levels ──────────────────────────────────────────────────────────────────

func (s *CurriculumService) CreateLevel(ctx context.Context, req models.CreateLevelRequest) (db.Level, error) {
	gradeID, err := parseOptionalUUID(req.GradeID)
	if err != nil {
		return db.Level{}, errors.New("invalid grade_id")
	}

	return s.repo.CreateLevel(ctx, db.CreateLevelParams{
		Label:     req.Label,
		GradeID:   gradeID,
		SortOrder: req.SortOrder,
	})
}

func (s *CurriculumService) GetLevel(ctx context.Context, id uuid.UUID) (db.Level, error) {
	return s.repo.GetLevelByID(ctx, id)
}

func (s *CurriculumService) ListLevels(ctx context.Context) ([]db.Level, error) {
	return s.repo.ListLevels(ctx)
}

func (s *CurriculumService) ListLevelsByGrade(ctx context.Context, gradeID uuid.UUID) ([]db.Level, error) {
	return s.repo.ListLevelsByGrade(ctx, pgUUID(gradeID))
}

func (s *CurriculumService) UpdateLevel(ctx context.Context, id uuid.UUID, req models.UpdateLevelRequest) (db.Level, error) {
	gradeID, err := parseOptionalUUID(req.GradeID)
	if err != nil {
		return db.Level{}, errors.New("invalid grade_id")
	}

	return s.repo.UpdateLevel(ctx, db.UpdateLevelParams{
		ID:        id,
		Label:     req.Label,
		GradeID:   gradeID,
		SortOrder: req.SortOrder,
	})
}

// DuplicateLevel copies a level's whole structure under a new label. Useful
// where consecutive levels share a curriculum (e.g. two grades of the same
// exam stage) and re-entering every group by hand would be busywork.
func (s *CurriculumService) DuplicateLevel(ctx context.Context, sourceID uuid.UUID, req models.DuplicateLevelRequest) (db.Level, error) {
	if _, err := s.repo.GetLevelByID(ctx, sourceID); err != nil {
		return db.Level{}, ErrLevelNotFound
	}

	gradeID, err := parseOptionalUUID(req.GradeID)
	if err != nil {
		return db.Level{}, errors.New("invalid grade_id")
	}

	return s.repo.DuplicateLevel(ctx, sourceID, db.CreateLevelParams{
		Label:     req.Label,
		GradeID:   gradeID,
		SortOrder: req.SortOrder,
	})
}

func (s *CurriculumService) DeleteLevel(ctx context.Context, id uuid.UUID) error {
	rows, err := s.repo.DeleteLevel(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		if _, err := s.repo.GetLevelByID(ctx, id); err != nil {
			return ErrLevelNotFound
		}
		return ErrLevelInUse
	}
	return nil
}

// ── selection groups ────────────────────────────────────────────────────────

func (s *CurriculumService) CreateSelectionGroup(ctx context.Context, levelID uuid.UUID, req models.CreateSelectionGroupRequest) (db.SelectionGroup, error) {
	if req.MaxSelect < req.MinSelect {
		return db.SelectionGroup{}, ErrInvalidSelectRange
	}
	if _, err := s.repo.GetLevelByID(ctx, levelID); err != nil {
		return db.SelectionGroup{}, ErrLevelNotFound
	}

	return s.repo.CreateSelectionGroup(ctx, db.CreateSelectionGroupParams{
		LevelID:   levelID,
		Label:     req.Label,
		MinSelect: req.MinSelect,
		MaxSelect: req.MaxSelect,
		SortOrder: req.SortOrder,
	})
}

func (s *CurriculumService) GetSelectionGroup(ctx context.Context, id uuid.UUID) (db.SelectionGroup, error) {
	return s.repo.GetSelectionGroupByID(ctx, id)
}

func (s *CurriculumService) ListSelectionGroupsByLevel(ctx context.Context, levelID uuid.UUID) ([]db.SelectionGroup, error) {
	return s.repo.ListSelectionGroupsByLevel(ctx, levelID)
}

func (s *CurriculumService) UpdateSelectionGroup(ctx context.Context, id uuid.UUID, req models.UpdateSelectionGroupRequest) (db.SelectionGroup, error) {
	if req.MaxSelect < req.MinSelect {
		return db.SelectionGroup{}, ErrInvalidSelectRange
	}

	return s.repo.UpdateSelectionGroup(ctx, db.UpdateSelectionGroupParams{
		ID:        id,
		Label:     req.Label,
		MinSelect: req.MinSelect,
		MaxSelect: req.MaxSelect,
		SortOrder: req.SortOrder,
	})
}

func (s *CurriculumService) DeleteSelectionGroup(ctx context.Context, id uuid.UUID) error {
	rows, err := s.repo.DeleteSelectionGroup(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		if _, err := s.repo.GetSelectionGroupByID(ctx, id); err != nil {
			return ErrSelectionGroupNotFound
		}
		return ErrSelectionGroupInUse
	}
	return nil
}

// ── group subjects ──────────────────────────────────────────────────────────

func (s *CurriculumService) AddGroupSubject(ctx context.Context, groupID uuid.UUID, req models.AddGroupSubjectRequest) (db.GroupSubject, error) {
	subjectID, err := uuid.Parse(req.SubjectID)
	if err != nil {
		return db.GroupSubject{}, errors.New("invalid subject_id")
	}

	mediumID, err := parseOptionalUUID(req.MediumID)
	if err != nil {
		return db.GroupSubject{}, errors.New("invalid medium_id")
	}

	if _, err := s.repo.GetSelectionGroupByID(ctx, groupID); err != nil {
		return db.GroupSubject{}, ErrSelectionGroupNotFound
	}

	return s.repo.AddGroupSubject(ctx, db.AddGroupSubjectParams{
		GroupID:          groupID,
		SubjectID:        subjectID,
		MediumID:         mediumID,
		PrerequisiteNote: optionalText(req.PrerequisiteNote),
		SortOrder:        req.SortOrder,
	})
}

func (s *CurriculumService) ListGroupSubjects(ctx context.Context, groupID uuid.UUID) ([]models.GroupSubjectResponse, error) {
	rows, err := s.repo.ListGroupSubjects(ctx, groupID)
	if err != nil {
		return nil, err
	}

	resp := make([]models.GroupSubjectResponse, len(rows))
	for i, r := range rows {
		resp[i] = models.GroupSubjectResponse{
			SubjectID:        r.SubjectID.String(),
			SubjectName:      r.SubjectName,
			SubjectCode:      r.SubjectCode,
			SubjectType:      textString(r.SubjectType),
			MediumID:         uuidString(r.MediumID),
			MediumName:       textString(r.MediumName),
			PrerequisiteNote: textString(r.PrerequisiteNote),
			SortOrder:        r.SortOrder,
		}
	}
	return resp, nil
}

func (s *CurriculumService) RemoveGroupSubject(ctx context.Context, groupID, subjectID uuid.UUID) error {
	return s.repo.RemoveGroupSubject(ctx, db.RemoveGroupSubjectParams{
		GroupID:   groupID,
		SubjectID: subjectID,
	})
}

// ── curriculum tree ─────────────────────────────────────────────────────────

// GetCurriculumTree returns a level with its groups and each group's subjects
// nested inside, in two queries.
func (s *CurriculumService) GetCurriculumTree(ctx context.Context, levelID uuid.UUID) (models.CurriculumTreeResponse, error) {
	level, err := s.repo.GetLevelByID(ctx, levelID)
	if err != nil {
		return models.CurriculumTreeResponse{}, ErrLevelNotFound
	}

	rows, err := s.repo.GetCurriculumTreeByLevel(ctx, levelID)
	if err != nil {
		return models.CurriculumTreeResponse{}, err
	}

	groups := make([]models.CurriculumGroupResponse, 0)
	position := make(map[uuid.UUID]int)

	for _, row := range rows {
		i, seen := position[row.GroupID]
		if !seen {
			groups = append(groups, models.CurriculumGroupResponse{
				ID:        row.GroupID.String(),
				Label:     row.GroupLabel,
				MinSelect: row.MinSelect,
				MaxSelect: row.MaxSelect,
				SortOrder: row.GroupSortOrder,
				Subjects:  []models.GroupSubjectResponse{},
			})
			i = len(groups) - 1
			position[row.GroupID] = i
		}

		// a group with no subjects still returns one row, with a NULL subject
		if !row.SubjectID.Valid {
			continue
		}

		groups[i].Subjects = append(groups[i].Subjects, models.GroupSubjectResponse{
			SubjectID:        uuid.UUID(row.SubjectID.Bytes).String(),
			SubjectName:      row.SubjectName.String,
			SubjectCode:      row.SubjectCode.String,
			SubjectType:      textString(row.SubjectType),
			MediumID:         uuidString(row.MediumID),
			MediumName:       textString(row.MediumName),
			PrerequisiteNote: textString(row.PrerequisiteNote),
			SortOrder:        row.SubjectSortOrder.Int32,
		})
	}

	return models.CurriculumTreeResponse{
		Level:  ToLevelResponse(level),
		Groups: groups,
	}, nil
}

func ToLevelResponse(l db.Level) models.LevelResponse {
	return models.LevelResponse{
		ID:        l.ID.String(),
		Label:     l.Label,
		GradeID:   uuidString(l.GradeID),
		SortOrder: l.SortOrder,
		CreatedAt: l.CreatedAt.Time.String(),
	}
}
