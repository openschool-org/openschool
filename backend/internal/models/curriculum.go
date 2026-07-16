package models

// ── mediums ─────────────────────────────────────────────────────────────────

type CreateMediumRequest struct {
	Name string `json:"name" binding:"required"`
}

type UpdateMediumRequest struct {
	Name string `json:"name" binding:"required"`
}

type MediumResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
}

// ── levels ──────────────────────────────────────────────────────────────────

// GradeID is optional: a level that is not tied to a single grade omits it.
type CreateLevelRequest struct {
	Label     string `json:"label" binding:"required"`
	GradeID   string `json:"grade_id"`
	SortOrder int32  `json:"sort_order"`
}

type UpdateLevelRequest struct {
	Label     string `json:"label" binding:"required"`
	GradeID   string `json:"grade_id"`
	SortOrder int32  `json:"sort_order"`
}

type LevelResponse struct {
	ID        string  `json:"id"`
	Label     string  `json:"label"`
	GradeID   *string `json:"grade_id"`
	SortOrder int32   `json:"sort_order"`
	CreatedAt string  `json:"created_at"`
}

// DuplicateLevelRequest copies an existing level's groups and group subjects
// under a new label. Labels are unique, so the new one must differ.
type DuplicateLevelRequest struct {
	Label     string `json:"label" binding:"required"`
	GradeID   string `json:"grade_id"`
	SortOrder int32  `json:"sort_order"`
}

// ── selection groups ────────────────────────────────────────────────────────

// A group where every subject is mandatory is simply min_select = max_select =
// the number of subjects in the group.
type CreateSelectionGroupRequest struct {
	Label     string `json:"label" binding:"required"`
	MinSelect int32  `json:"min_select" binding:"gte=0"`
	MaxSelect int32  `json:"max_select" binding:"gte=0"`
	SortOrder int32  `json:"sort_order"`
}

type UpdateSelectionGroupRequest struct {
	Label     string `json:"label" binding:"required"`
	MinSelect int32  `json:"min_select" binding:"gte=0"`
	MaxSelect int32  `json:"max_select" binding:"gte=0"`
	SortOrder int32  `json:"sort_order"`
}

type SelectionGroupResponse struct {
	ID        string `json:"id"`
	LevelID   string `json:"level_id"`
	Label     string `json:"label"`
	MinSelect int32  `json:"min_select"`
	MaxSelect int32  `json:"max_select"`
	SortOrder int32  `json:"sort_order"`
	CreatedAt string `json:"created_at"`
}

// ── group subjects ──────────────────────────────────────────────────────────

// MediumID empty means the subject is offered in any medium.
// PrerequisiteNote is informational guidance only and is never enforced.
type AddGroupSubjectRequest struct {
	SubjectID        string `json:"subject_id" binding:"required"`
	MediumID         string `json:"medium_id"`
	PrerequisiteNote string `json:"prerequisite_note"`
	SortOrder        int32  `json:"sort_order"`
}

type GroupSubjectResponse struct {
	SubjectID        string  `json:"subject_id"`
	SubjectName      string  `json:"subject_name"`
	SubjectCode      string  `json:"subject_code"`
	SubjectType      *string `json:"subject_type"`
	MediumID         *string `json:"medium_id"`
	MediumName       *string `json:"medium_name"`
	PrerequisiteNote *string `json:"prerequisite_note"`
	SortOrder        int32   `json:"sort_order"`
}

// ── curriculum tree ─────────────────────────────────────────────────────────

type CurriculumTreeResponse struct {
	Level  LevelResponse             `json:"level"`
	Groups []CurriculumGroupResponse `json:"groups"`
}

type CurriculumGroupResponse struct {
	ID        string                 `json:"id"`
	Label     string                 `json:"label"`
	MinSelect int32                  `json:"min_select"`
	MaxSelect int32                  `json:"max_select"`
	SortOrder int32                  `json:"sort_order"`
	Subjects  []GroupSubjectResponse `json:"subjects"`
}
