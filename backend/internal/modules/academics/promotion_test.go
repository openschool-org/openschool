package academics

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type previewStore struct {
	promotionStore
	list       []promotionStudent
	next       map[uuid.UUID]promotionGrade
	byName     map[string]promotionClass
	byMedium   map[string]promotionClass
	marksRows  []promotionMarks
	gradeCalls int
	classCalls int
}

func (s *previewStore) students(context.Context, uuid.UUID) ([]promotionStudent, error) {
	return s.list, nil
}

func (s *previewStore) nextGrade(_ context.Context, id uuid.UUID) (promotionGrade, error) {
	s.gradeCalls++
	g, ok := s.next[id]
	if !ok {
		return promotionGrade{}, pgx.ErrNoRows
	}
	return g, nil
}

func (s *previewStore) classByName(_ context.Context, _, _ uuid.UUID, name string) (promotionClass, error) {
	s.classCalls++
	c, ok := s.byName[name]
	if !ok {
		return promotionClass{}, pgx.ErrNoRows
	}
	return c, nil
}

func (s *previewStore) classByMedium(_ context.Context, _, _ uuid.UUID, medium string) (promotionClass, error) {
	s.classCalls++
	c, ok := s.byMedium[medium]
	if !ok {
		return promotionClass{}, pgx.ErrNoRows
	}
	return c, nil
}

func (s *previewStore) marks(context.Context, uuid.UUID, []uuid.UUID) ([]promotionMarks, error) {
	return s.marksRows, nil
}

func TestPromotionPreview(t *testing.T) {
	g10, g11, g13 := uuid.New(), uuid.New(), uuid.New()
	tamil := "tamil"
	classA := promotionClass{ID: uuid.New(), Name: "A"}
	classT := promotionClass{ID: uuid.New(), Name: "T"}
	ann := promotionStudent{ID: uuid.New(), GradeID: g10, ClassName: "A", Name: "Ann"}
	ben := promotionStudent{ID: uuid.New(), GradeID: g10, ClassName: "A", Name: "Ben"}
	cal := promotionStudent{ID: uuid.New(), GradeID: g10, ClassName: "B", Name: "Cal"}
	dev := promotionStudent{ID: uuid.New(), GradeID: g10, ClassName: "A", Name: "Dev", MediumID: &tamil}
	eve := promotionStudent{ID: uuid.New(), GradeID: g13, ClassName: "A", Name: "Eve"}
	store := &previewStore{
		list:      []promotionStudent{ann, ben, cal, dev, eve},
		next:      map[uuid.UUID]promotionGrade{g10: {ID: g11, Name: "Grade 11"}},
		byName:    map[string]promotionClass{"A": classA},
		byMedium:  map[string]promotionClass{"tamil": classT},
		marksRows: []promotionMarks{{ID: ann.ID, Total: 420, Max: 500}},
	}
	term := uuid.New()

	rows, err := (&promotionService{store: store}).Preview(context.Background(), uuid.New(), uuid.New(), &term)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 5 {
		t.Fatalf("rows = %d, want 5", len(rows))
	}
	suggested := func(i int) string {
		if rows[i].SuggestedClassName == nil {
			return ""
		}
		return *rows[i].SuggestedClassName
	}
	if suggested(0) != "A" || suggested(1) != "A" || *rows[0].NextGradeName != "Grade 11" {
		t.Fatalf("same class name should carry over: %+v %+v", rows[0], rows[1])
	}
	if suggested(2) != "" || rows[2].NextGradeID == nil {
		t.Fatalf("no matching class should leave the suggestion empty: %+v", rows[2])
	}
	if suggested(3) != "T" || !rows[3].MediumLocked {
		t.Fatalf("a medium-locked student should follow the medium: %+v", rows[3])
	}
	if !rows[4].Graduating || rows[4].NextGradeID != nil {
		t.Fatalf("top grade should graduate: %+v", rows[4])
	}
	if rows[0].TotalMarks == nil || *rows[0].TotalMarks != 420 || rows[1].TotalMarks != nil {
		t.Fatalf("marks not attached: %+v %+v", rows[0].TotalMarks, rows[1].TotalMarks)
	}
	if store.gradeCalls != 2 || store.classCalls != 3 {
		t.Fatalf("lookups should be cached: grade=%d class=%d", store.gradeCalls, store.classCalls)
	}
}
