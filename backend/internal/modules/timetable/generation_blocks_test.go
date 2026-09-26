package timetable

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

type generationStoreStub struct {
	classes      []generationClass
	teachers     map[uuid.UUID][]generationTeacherSubject
	requirements map[uuid.UUID][]generationRequirement
	blocks       []OptionBlock
	periodCount  int32
	lessons      map[uuid.UUID][]generationSlot // timetable id -> slots of ordinary lessons
	blockEntries map[uuid.UUID][]generationSlot // timetable id -> slots of block periods
	classOf      map[uuid.UUID]uuid.UUID        // timetable id -> class id
}

func (s *generationStoreStub) classesByGradeSection(context.Context, uuid.UUID, uuid.UUID) ([]generationClass, error) {
	return s.classes, nil
}
func (s *generationStoreStub) latestTimetablesByClass(context.Context, uuid.UUID, uuid.UUID) ([]TimetableListItem, error) {
	return nil, nil
}
func (s *generationStoreStub) deleteDraft(context.Context, uuid.UUID) (int64, error) { return 0, nil }
func (s *generationStoreStub) allBookings(context.Context, uuid.UUID) ([]generationBusy, error) {
	return nil, nil
}
func (s *generationStoreStub) periods(context.Context, uuid.UUID) ([]generationPeriod, error) {
	out := make([]generationPeriod, s.periodCount)
	for i := range out {
		n := int32(i + 1)
		out[i] = generationPeriod{Number: &n, SlotType: "period"}
	}
	return out, nil
}
func (s *generationStoreStub) subjectTeachers(_ context.Context, class uuid.UUID) ([]generationTeacherSubject, error) {
	return s.teachers[class], nil
}
func (s *generationStoreStub) requirementsForGrade(_ context.Context, _ uuid.UUID, grade uuid.UUID) ([]generationRequirement, error) {
	return s.requirements[grade], nil
}
func (s *generationStoreStub) teacherName(context.Context, uuid.UUID) (string, error) { return "", nil }
func (s *generationStoreStub) availability(context.Context, uuid.UUID, uuid.UUID) ([]generationAvailability, error) {
	return nil, nil
}
func (s *generationStoreStub) labsForSubject(context.Context, uuid.UUID) ([]Classroom, error) {
	return nil, nil
}
func (s *generationStoreStub) create(_ context.Context, _, class, _ uuid.UUID, _ *uuid.UUID) (Timetable, error) {
	id := uuid.New()
	s.classOf[id] = class
	return Timetable{ID: id, ClassID: class}, nil
}
func (s *generationStoreStub) upsertGeneratedEntry(_ context.Context, tt uuid.UUID, day, period int16, _, _ uuid.UUID, _ *uuid.UUID) error {
	s.lessons[tt] = append(s.lessons[tt], generationSlot{day, period})
	return nil
}
func (s *generationStoreStub) optionBlocks(context.Context, []uuid.UUID) ([]OptionBlock, error) {
	return s.blocks, nil
}
func (s *generationStoreStub) upsertBlockEntry(_ context.Context, tt uuid.UUID, day, period int16, _ uuid.UUID) error {
	s.blockEntries[tt] = append(s.blockEntries[tt], generationSlot{day, period})
	return nil
}

func TestOptionBlocksShareThePeriodAcrossClasses(t *testing.T) {
	grade, maths, music, art := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	a, b := uuid.New(), uuid.New()
	musicTeacher, artTeacher, mathsA, mathsB := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	store := &generationStoreStub{
		classes: []generationClass{{ID: a, GradeID: grade, Name: "10-A"}, {ID: b, GradeID: grade, Name: "10-B"}},
		teachers: map[uuid.UUID][]generationTeacherSubject{
			a: {{SubjectID: maths, TeacherID: mathsA}, {SubjectID: music, TeacherID: musicTeacher}, {SubjectID: art, TeacherID: artTeacher}},
			b: {{SubjectID: maths, TeacherID: mathsB}, {SubjectID: music, TeacherID: musicTeacher}, {SubjectID: art, TeacherID: artTeacher}},
		},
		requirements: map[uuid.UUID][]generationRequirement{grade: {{SubjectID: maths, SubjectName: "Maths", Periods: 3}, {SubjectID: music, SubjectName: "Music", Periods: 2}, {SubjectID: art, SubjectName: "Art", Periods: 2}}},
		blocks:       []OptionBlock{{ID: uuid.New(), GradeID: grade, Name: "Basket 1", Periods: 2, Subjects: []uuid.UUID{music, art}, Classes: []uuid.UUID{a, b}}},
		periodCount:  2,
		lessons:      map[uuid.UUID][]generationSlot{}, blockEntries: map[uuid.UUID][]generationSlot{}, classOf: map[uuid.UUID]uuid.UUID{},
	}
	result, err := (&generationService{store: store}).generate(context.Background(), GenerationRequest{}, uuid.New())
	if err != nil {
		t.Fatal(err)
	}
	slotsOf := map[uuid.UUID][]generationSlot{}
	for tt, class := range store.classOf {
		slotsOf[class] = store.blockEntries[tt]
		if len(store.lessons[tt]) != 3 {
			t.Fatalf("maths lessons = %d, want 3 (music and art run in the block, not as lessons)", len(store.lessons[tt]))
		}
	}
	if len(slotsOf[a]) != 2 || len(slotsOf[b]) != 2 {
		t.Fatalf("block periods: %v", slotsOf)
	}
	for i := range slotsOf[a] {
		if slotsOf[a][i] != slotsOf[b][i] {
			t.Fatalf("10-A and 10-B must share block periods: %v vs %v", slotsOf[a], slotsOf[b])
		}
	}
	if slotsOf[a][0].Day == slotsOf[a][1].Day {
		t.Fatal("the two block periods should fall on different days when possible")
	}
	for _, c := range result.Classes {
		if len(c.Gaps) != 0 || c.Placed != 5 || c.Required != 5 {
			t.Fatalf("%s: placed %d of %d, gaps %v", c.ClassName, c.Placed, c.Required, c.Gaps)
		}
	}
}

func TestRepairMovesTheTeachersOtherLesson(t *testing.T) {
	teacher, c1, c2 := uuid.New(), uuid.New(), uuid.New()
	s1, s2 := generationSlot{1, 1}, generationSlot{1, 2}
	grid := generationGrid{
		slots:              []generationSlot{s1, s2},
		teacherBusy:        map[uuid.UUID]map[generationSlot]bool{teacher: {s1: true}},
		teacherUnavailable: map[uuid.UUID]map[generationSlot]bool{},
		classroomBusy:      map[uuid.UUID]map[generationSlot]bool{},
		classBusy:          map[uuid.UUID]map[generationSlot]bool{c1: {s2: true}, c2: {s1: true}},
	}
	placements := map[uuid.UUID][]generationPlacement{c2: {{task: generationTask{ClassID: c2, TeacherID: teacher}, slots: []generationSlot{s1}}}}
	task := generationTask{ClassID: c1, TeacherID: teacher, SubjectName: "Maths"}
	fixed, err := (&generationService{}).repair(context.Background(), task, grid, placements)
	if err != nil || !fixed {
		t.Fatalf("repair = %v, %v", fixed, err)
	}
	if placements[c2][0].slots[0] != s2 || placements[c1][0].slots[0] != s1 {
		t.Fatalf("placements after repair: %+v", placements)
	}
	if !grid.classBusy[c1][s1] || !grid.classBusy[c2][s2] || grid.classBusy[c2][s1] || !grid.teacherBusy[teacher][s2] {
		t.Fatalf("busy maps not updated: %+v", grid)
	}
}
