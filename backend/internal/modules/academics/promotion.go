package academics

import (
	"context"
	"errors"
	"fmt"
	"sort"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

var ErrCommitTargetClassMismatch = errors.New("one or more target classes do not belong to the target academic year")

type promotionStudent struct {
	ID, ClassID, GradeID              uuid.UUID
	Name, Index, ClassName, GradeName string
	MediumID, MediumName              *string
}
type promotionGrade struct {
	ID   uuid.UUID
	Name string
}
type promotionClass struct {
	ID   uuid.UUID
	Name string
}
type promotionMarks struct {
	ID         uuid.UUID
	Total, Max float64
}
type promotionStore interface {
	students(context.Context, uuid.UUID) ([]promotionStudent, error)
	nextGrade(context.Context, uuid.UUID) (promotionGrade, error)
	classByName(context.Context, uuid.UUID, uuid.UUID, string) (promotionClass, error)
	classByMedium(context.Context, uuid.UUID, uuid.UUID, string) (promotionClass, error)
	marks(context.Context, uuid.UUID, []uuid.UUID) ([]promotionMarks, error)
	validClasses(context.Context, uuid.UUID, []uuid.UUID) (int64, error)
	commit(context.Context, uuid.UUID, []uuid.UUID, []uuid.UUID) error
}
type promotionService struct{ store promotionStore }

func NewPromotionService(store promotionStore) PromotionRunner {
	return &promotionService{store: store}
}

func (s *promotionService) Preview(ctx context.Context, source, target uuid.UUID, term *uuid.UUID) ([]PromotionPreviewRow, error) {
	students, err := s.store.students(ctx, source)
	if err != nil {
		return nil, fmt.Errorf("failed to list students for source year: %w", err)
	}
	lookup := previewLookup{store: s.store, target: target, grades: map[uuid.UUID]*promotionGrade{}, classes: map[string]*promotionClass{}}
	result := make([]PromotionPreviewRow, 0, len(students))
	ids := make([]uuid.UUID, 0, len(students))
	for _, student := range students {
		row, err := lookup.row(ctx, student)
		if err != nil {
			return nil, err
		}
		result = append(result, row)
		ids = append(ids, student.ID)
	}
	if term != nil {
		if err := s.attachMarks(ctx, *term, ids, result); err != nil {
			return nil, err
		}
	}
	return result, nil
}

// previewLookup caches next-grade and suggested-class lookups, since most students share them.
type previewLookup struct {
	store   promotionStore
	target  uuid.UUID
	grades  map[uuid.UUID]*promotionGrade // nil value: top grade, the student graduates
	classes map[string]*promotionClass    // nil value: no matching class next year
}

func (l *previewLookup) row(ctx context.Context, student promotionStudent) (PromotionPreviewRow, error) {
	row := PromotionPreviewRow{StudentID: student.ID.String(), StudentName: student.Name, StudentIndex: student.Index, CurrentClassID: student.ClassID.String(), CurrentClassName: student.ClassName, CurrentGradeID: student.GradeID.String(), CurrentGradeName: student.GradeName, MediumLocked: student.MediumID != nil, CurrentMediumID: student.MediumID, CurrentMediumName: student.MediumName}
	grade, err := l.nextGrade(ctx, student.GradeID)
	if err != nil {
		return row, err
	}
	if grade == nil {
		row.Graduating = true
		return row, nil
	}
	nextID, nextName := grade.ID.String(), grade.Name
	row.NextGradeID, row.NextGradeName = &nextID, &nextName
	class, err := l.suggestedClass(ctx, grade.ID, student)
	if err != nil {
		return row, err
	}
	if class != nil {
		id, name := class.ID.String(), class.Name
		row.SuggestedClassID, row.SuggestedClassName = &id, &name
	}
	return row, nil
}

func (l *previewLookup) nextGrade(ctx context.Context, gradeID uuid.UUID) (*promotionGrade, error) {
	if grade, ok := l.grades[gradeID]; ok {
		return grade, nil
	}
	value, err := l.store.nextGrade(ctx, gradeID)
	if errors.Is(err, pgx.ErrNoRows) {
		l.grades[gradeID] = nil
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to resolve next grade: %w", err)
	}
	l.grades[gradeID] = &value
	return &value, nil
}

// suggestedClass follows the student's medium when it is locked, otherwise the same class name.
func (l *previewLookup) suggestedClass(ctx context.Context, nextGrade uuid.UUID, student promotionStudent) (*promotionClass, error) {
	key := nextGrade.String() + "|name|" + student.ClassName
	if student.MediumID != nil {
		key += "|medium|" + *student.MediumID
	}
	if class, ok := l.classes[key]; ok {
		return class, nil
	}
	var value promotionClass
	var err error
	if student.MediumID != nil {
		value, err = l.store.classByMedium(ctx, nextGrade, l.target, *student.MediumID)
	} else {
		value, err = l.store.classByName(ctx, nextGrade, l.target, student.ClassName)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		l.classes[key] = nil
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to resolve suggested class: %w", err)
	}
	l.classes[key] = &value
	return &value, nil
}

// attachMarks adds each student's term total, when there is one.
func (s *promotionService) attachMarks(ctx context.Context, term uuid.UUID, ids []uuid.UUID, rows []PromotionPreviewRow) error {
	marks, err := s.store.marks(ctx, term, ids)
	if err != nil {
		return fmt.Errorf("failed to load marks: %w", err)
	}
	by := map[uuid.UUID]promotionMarks{}
	for _, mark := range marks {
		by[mark.ID] = mark
	}
	for i := range rows {
		if mark, ok := by[uuid.MustParse(rows[i].StudentID)]; ok {
			rows[i].TotalMarks, rows[i].TotalMaxMarks = &mark.Total, &mark.Max
		}
	}
	return nil
}

func (s *promotionService) CommitAssignments(ctx context.Context, request CommitAssignmentsRequest) (int, error) {
	year, err := uuid.Parse(request.AcademicYearID)
	if err != nil {
		return 0, errors.New("invalid academic year id")
	}
	students := make([]uuid.UUID, len(request.Assignments))
	classes := make([]uuid.UUID, len(request.Assignments))
	unique := map[uuid.UUID]bool{}
	for i, assignment := range request.Assignments {
		students[i], err = uuid.Parse(assignment.StudentID)
		if err != nil {
			return 0, fmt.Errorf("invalid student id: %s", assignment.StudentID)
		}
		classes[i], err = uuid.Parse(assignment.ClassID)
		if err != nil {
			return 0, fmt.Errorf("invalid class id: %s", assignment.ClassID)
		}
		unique[classes[i]] = true
	}
	ids := make([]uuid.UUID, 0, len(unique))
	for id := range unique {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i].String() < ids[j].String() })
	count, err := s.store.validClasses(ctx, year, ids)
	if err != nil {
		return 0, err
	}
	if int(count) != len(ids) {
		return 0, ErrCommitTargetClassMismatch
	}
	if err := s.store.commit(ctx, year, students, classes); err != nil {
		return 0, err
	}
	return len(students), nil
}
