package academics

import (
	"context"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

var ErrNotAssignedToSubject = errors.New("you are not assigned to teach this subject for this class")

// ErrTermOutsideClassYear stops marks being written into, or deleted from, a
// term of another academic year (S4).
var ErrTermOutsideClassYear = errors.New("this term is not part of the class's academic year")

type termMarkStore interface {
	authorizeSubject(context.Context, TermMarkActor, uuid.UUID, uuid.UUID) error
	enrolled(context.Context, uuid.UUID, []uuid.UUID) ([]uuid.UUID, error)
	upsert(context.Context, uuid.UUID, uuid.UUID, uuid.UUID, pgtype.Numeric, pgtype.Numeric, bool, uuid.UUID) (any, error)
	listClass(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) (any, error)
	listStudent(context.Context, uuid.UUID, uuid.UUID) (any, error)
	markOwner(context.Context, uuid.UUID) (student, subject, term uuid.UUID, err error)
	termInClassYear(ctx context.Context, term, class uuid.UUID) (bool, error)
	studentClass(context.Context, uuid.UUID) (uuid.UUID, error)
	authorizeClass(context.Context, TermMarkActor, uuid.UUID) error
	delete(context.Context, uuid.UUID) error
}
type termMarkService struct{ store termMarkStore }

func NewTermMarkService(store termMarkStore) TermMarkRunner { return &termMarkService{store: store} }
func markNumeric(value float64) (pgtype.Numeric, error) {
	var n pgtype.Numeric
	if err := n.Scan(fmt.Sprintf("%.2f", value)); err != nil {
		return n, err
	}
	return n, nil
}
func (s *termMarkService) BulkUpsertMarks(ctx context.Context, class uuid.UUID, actor TermMarkActor, req BulkUpsertMarksRequest) (any, error) {
	term, e := uuid.Parse(req.TermID)
	if e != nil {
		return nil, e
	}
	subject, e := uuid.Parse(req.SubjectID)
	if e != nil {
		return nil, e
	}
	if e = s.store.authorizeSubject(ctx, actor, class, subject); e != nil {
		return nil, e
	}
	if e = s.checkTerm(ctx, term, class); e != nil {
		return nil, e
	}
	ids := make([]uuid.UUID, len(req.Entries))
	for i, v := range req.Entries {
		ids[i], e = uuid.Parse(v.StudentID)
		if e != nil {
			return nil, e
		}
	}
	enrolled, e := s.store.enrolled(ctx, class, ids)
	if e != nil {
		return nil, fmt.Errorf("failed to verify class enrollment: %w", e)
	}
	allowed := map[uuid.UUID]bool{}
	for _, id := range enrolled {
		allowed[id] = true
	}
	out := make([]any, 0, len(ids))
	for i, v := range req.Entries {
		if !allowed[ids[i]] {
			return nil, fmt.Errorf("student %s is not enrolled in this class", v.StudentID)
		}
		marks := v.Marks
		if v.IsAbsent {
			marks = 0
		}
		max := v.MaxMarks
		if max == 0 {
			max = 100
		}
		m, e := markNumeric(marks)
		if e != nil {
			return nil, e
		}
		mm, e := markNumeric(max)
		if e != nil {
			return nil, e
		}
		value, e := s.store.upsert(ctx, ids[i], subject, term, m, mm, v.IsAbsent, actor.ID)
		if e != nil {
			return nil, e
		}
		out = append(out, value)
	}
	return out, nil
}
func (s *termMarkService) ListClassMarks(ctx context.Context, actor TermMarkActor, class, term, subject uuid.UUID) (any, error) {
	if e := s.store.authorizeSubject(ctx, actor, class, subject); e != nil {
		return nil, e
	}
	return s.store.listClass(ctx, class, term, subject)
}
func (s *termMarkService) ListStudentMarks(ctx context.Context, student, term uuid.UUID) (any, error) {
	return s.store.listStudent(ctx, student, term)
}
func (s *termMarkService) ListStudentMarksForTeacher(ctx context.Context, actor TermMarkActor, student, term uuid.UUID) (any, error) {
	class, e := s.store.studentClass(ctx, student)
	if e != nil {
		return nil, ErrNotAssignedToSubject
	}
	if e = s.store.authorizeClass(ctx, actor, class); e != nil {
		return nil, e
	}
	return s.store.listStudent(ctx, student, term)
}
func (s *termMarkService) DeleteMark(ctx context.Context, actor TermMarkActor, id uuid.UUID) error {
	student, subject, term, e := s.store.markOwner(ctx, id)
	if e != nil {
		return errors.New("mark not found")
	}
	class, e := s.store.studentClass(ctx, student)
	if e != nil && actor.Role != "admin" {
		return ErrNotAssignedToSubject
	}
	if e == nil {
		if e = s.store.authorizeSubject(ctx, actor, class, subject); e != nil {
			return e
		}
		// Only an admin may remove a mark from an earlier year's term.
		if actor.Role != "admin" {
			if e = s.checkTerm(ctx, term, class); e != nil {
				return e
			}
		}
	}
	return s.store.delete(ctx, id)
}

func (s *termMarkService) checkTerm(ctx context.Context, term, class uuid.UUID) error {
	ok, err := s.store.termInClassYear(ctx, term, class)
	if err != nil {
		return fmt.Errorf("failed to check the term: %w", err)
	}
	if !ok {
		return ErrTermOutsideClassYear
	}
	return nil
}
