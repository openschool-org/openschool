package workflows

import (
	"context"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
)

// ---- W6 teacher allocation ----

// SubjectHours is one subject's weekly periods for a grade.
type SubjectHours struct {
	GradeID, SubjectID uuid.UUID
	SubjectName        string
	Periods            int
}

func (s *Store) subjectHours(ctx context.Context, year uuid.UUID) ([]SubjectHours, error) {
	rows, err := s.q.WfSubjectHours(ctx, year)
	if err != nil {
		return nil, err
	}
	out := make([]SubjectHours, len(rows))
	for i, r := range rows {
		out[i] = SubjectHours{GradeID: r.GradeID, SubjectID: r.SubjectID, SubjectName: r.SubjectName, Periods: int(r.PeriodsPerWeek)}
	}
	return out, nil
}

// TeacherInfo is an active teacher with the subjects they are qualified for.
type TeacherInfo struct {
	ID       uuid.UUID
	Name     string
	Subjects map[uuid.UUID]bool
}

func (s *Store) activeTeachers(ctx context.Context) ([]TeacherInfo, error) {
	rows, err := s.q.WfActiveTeachers(ctx)
	if err != nil {
		return nil, err
	}
	quals, err := s.q.WfTeacherSubjects(ctx)
	if err != nil {
		return nil, err
	}
	bySubject := map[uuid.UUID]map[uuid.UUID]bool{}
	for _, q := range quals {
		if bySubject[q.TeacherID] == nil {
			bySubject[q.TeacherID] = map[uuid.UUID]bool{}
		}
		bySubject[q.TeacherID][q.SubjectID] = true
	}
	out := make([]TeacherInfo, len(rows))
	for i, r := range rows {
		out[i] = TeacherInfo{ID: r.ID, Name: r.FullName, Subjects: bySubject[r.ID]}
		if out[i].Subjects == nil {
			out[i].Subjects = map[uuid.UUID]bool{}
		}
	}
	return out, nil
}

// SubjectTeacher is one class-subject-teacher assignment, kept in snapshots for revert.
type SubjectTeacher struct {
	ClassID   uuid.UUID `json:"class_id"`
	SubjectID uuid.UUID `json:"subject_id"`
	TeacherID uuid.UUID `json:"teacher_id"`
}

func (s *Store) yearSubjectTeachers(ctx context.Context, year uuid.UUID) ([]SubjectTeacher, error) {
	rows, err := s.q.WfYearSubjectTeachers(ctx, year)
	if err != nil {
		return nil, err
	}
	out := make([]SubjectTeacher, len(rows))
	for i, r := range rows {
		out[i] = SubjectTeacher{ClassID: r.ClassID, SubjectID: r.SubjectID, TeacherID: r.TeacherID}
	}
	return out, nil
}

func (s *Store) classPredecessors(ctx context.Context, source, target uuid.UUID) (map[uuid.UUID]uuid.UUID, error) {
	rows, err := s.q.WfClassPredecessors(ctx, db.WfClassPredecessorsParams{Source: source, Target: target})
	if err != nil {
		return nil, err
	}
	out := make(map[uuid.UUID]uuid.UUID, len(rows))
	for _, r := range rows {
		out[r.ClassID] = r.PreviousClassID
	}
	return out, nil
}

func (s *Store) setSubjectTeacher(ctx context.Context, class, subject uuid.UUID, teacher *uuid.UUID) error {
	if teacher == nil {
		return s.q.WfDeleteSubjectTeacher(ctx, db.WfDeleteSubjectTeacherParams{ClassID: class, SubjectID: subject})
	}
	return s.q.WfUpsertSubjectTeacher(ctx, db.WfUpsertSubjectTeacherParams{ClassID: class, SubjectID: subject, TeacherID: *teacher})
}

func (s *Store) setFormTeacher(ctx context.Context, class uuid.UUID, teacher *uuid.UUID) error {
	return s.q.WfSetFormTeacher(ctx, db.WfSetFormTeacherParams{ClassID: class, TeacherID: optUUID(teacher)})
}

func (s *Store) classesHaveSubmittedTimetables(ctx context.Context, ids []uuid.UUID) (bool, error) {
	return s.q.WfClassesHaveSubmittedTimetables(ctx, ids)
}
