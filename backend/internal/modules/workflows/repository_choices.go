package workflows

import (
	"context"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
)

// ---- W3 subject choices ----

// LevelInfo is a curriculum level tied to a grade.
type LevelInfo struct {
	ID, GradeID      uuid.UUID
	Label, GradeName string
}

func (s *Store) gradeLevels(ctx context.Context) ([]LevelInfo, error) {
	rows, err := s.q.WfLevelsForGrades(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]LevelInfo, len(rows))
	for i, r := range rows {
		out[i] = LevelInfo{ID: r.ID, GradeID: r.GradeID, Label: r.Label, GradeName: r.GradeName}
	}
	return out, nil
}

// ChoiceGroup is one selection group of a level with the subjects it offers.
type ChoiceGroup struct {
	ID       uuid.UUID
	Label    string
	Min, Max int
	Subjects []Option // value is the subject id
	Codes    map[string]uuid.UUID
}

// Fixed reports whether every subject in the group is taken, leaving nothing to choose.
func (g ChoiceGroup) Fixed() bool { return len(g.Subjects) <= g.Min }

func (s *Store) levelGroups(ctx context.Context, level uuid.UUID) ([]ChoiceGroup, error) {
	rows, err := s.q.WfLevelGroupSubjects(ctx, level)
	if err != nil {
		return nil, err
	}
	var out []ChoiceGroup
	for _, r := range rows {
		if len(out) == 0 || out[len(out)-1].ID != r.GroupID {
			out = append(out, ChoiceGroup{ID: r.GroupID, Label: r.GroupLabel, Min: int(r.MinSelect), Max: int(r.MaxSelect), Codes: map[string]uuid.UUID{}})
		}
		g := &out[len(out)-1]
		g.Subjects = append(g.Subjects, Option{Value: r.SubjectID.String(), Label: r.SubjectName})
		g.Codes[normalise(r.SubjectName)] = r.SubjectID
		if r.SubjectCode != "" {
			g.Codes[normalise(r.SubjectCode)] = r.SubjectID
		}
	}
	return out, nil
}

// Enrollment is one stored subject enrolment, kept in snapshots for revert.
type Enrollment struct {
	StudentID uuid.UUID  `json:"student_id"`
	GroupID   uuid.UUID  `json:"group_id"`
	SubjectID uuid.UUID  `json:"subject_id"`
	MediumID  *uuid.UUID `json:"medium_id,omitempty"`
	LevelID   uuid.UUID  `json:"level_id"`
}

func (s *Store) yearEnrollments(ctx context.Context, year uuid.UUID, ids []uuid.UUID) ([]Enrollment, error) {
	rows, err := s.q.WfYearEnrollments(ctx, db.WfYearEnrollmentsParams{Year: year, Ids: ids})
	if err != nil {
		return nil, err
	}
	out := make([]Enrollment, len(rows))
	for i, r := range rows {
		out[i] = Enrollment{StudentID: r.StudentID, GroupID: r.GroupID, SubjectID: r.SubjectID, MediumID: fromPgUUID(r.MediumID), LevelID: r.LevelID}
	}
	return out, nil
}

func (s *Store) lockedStudents(ctx context.Context, year, level uuid.UUID, ids []uuid.UUID) (map[uuid.UUID]bool, error) {
	rows, err := s.q.WfEnrollmentLocks(ctx, db.WfEnrollmentLocksParams{Year: year, Level: level, Ids: ids})
	if err != nil {
		return nil, err
	}
	out := make(map[uuid.UUID]bool, len(rows))
	for _, id := range rows {
		out[id] = true
	}
	return out, nil
}

// replaceLevelEnrollments clears these students' subjects in the level for the year and writes the given ones.
func (s *Store) replaceLevelEnrollments(ctx context.Context, year, level uuid.UUID, ids []uuid.UUID, rows []Enrollment) error {
	if err := s.q.WfDeleteLevelEnrollments(ctx, db.WfDeleteLevelEnrollmentsParams{Year: year, Level: level, Ids: ids}); err != nil {
		return err
	}
	for _, e := range rows {
		if err := s.q.WfInsertEnrollment(ctx, db.WfInsertEnrollmentParams{StudentID: e.StudentID, AcademicYearID: year, GroupID: e.GroupID, SubjectID: e.SubjectID, MediumID: optUUID(e.MediumID)}); err != nil {
			return err
		}
	}
	return nil
}

// setLocks makes exactly the given students locked for the level, among ids.
func (s *Store) setLocks(ctx context.Context, year, level uuid.UUID, ids, locked []uuid.UUID) error {
	if err := s.q.WfClearLevelLocks(ctx, db.WfClearLevelLocksParams{Year: year, Level: level, Ids: ids}); err != nil {
		return err
	}
	if len(locked) == 0 {
		return nil
	}
	return s.q.WfSetLevelLocks(ctx, db.WfSetLevelLocksParams{Year: year, Level: level, Ids: locked})
}

func (s *Store) studentsHaveMarks(ctx context.Context, year uuid.UUID, ids []uuid.UUID) (bool, error) {
	return s.q.WfStudentsHaveMarks(ctx, db.WfStudentsHaveMarksParams{Year: year, Ids: ids})
}
