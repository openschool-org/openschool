package timetable

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"testing"

	"github.com/google/uuid"
)

var updateGolden = flag.Bool("update", false, "rewrite golden files")

func fixedID(n int) uuid.UUID {
	return uuid.MustParse(fmt.Sprintf("00000000-0000-0000-0000-%012d", n))
}

// goldenGenStore is a deterministic generation store that logs every write.
type goldenGenStore struct {
	classes      []generationClass
	latest       map[uuid.UUID][]TimetableListItem
	bookings     []generationBusy
	periodGrid   []generationPeriod
	teachers     map[uuid.UUID][]generationTeacherSubject
	requirements map[uuid.UUID][]generationRequirement
	names        map[uuid.UUID]string
	unavailable  map[uuid.UUID][]generationAvailability
	labs         map[uuid.UUID][]Classroom
	blocks       []OptionBlock
	nextID       int
	log          []string
}

func (s *goldenGenStore) classesByGradeSection(context.Context, uuid.UUID, uuid.UUID) ([]generationClass, error) {
	return s.classes, nil
}
func (s *goldenGenStore) latestTimetablesByClass(_ context.Context, class, _ uuid.UUID) ([]TimetableListItem, error) {
	return s.latest[class], nil
}
func (s *goldenGenStore) deleteDraft(_ context.Context, id uuid.UUID) (int64, error) {
	s.log = append(s.log, "delete "+id.String())
	return 1, nil
}
func (s *goldenGenStore) allBookings(context.Context, uuid.UUID) ([]generationBusy, error) {
	return s.bookings, nil
}
func (s *goldenGenStore) periods(context.Context, uuid.UUID) ([]generationPeriod, error) {
	return s.periodGrid, nil
}
func (s *goldenGenStore) subjectTeachers(_ context.Context, class uuid.UUID) ([]generationTeacherSubject, error) {
	return s.teachers[class], nil
}
func (s *goldenGenStore) requirementsForGrade(_ context.Context, _ uuid.UUID, grade uuid.UUID) ([]generationRequirement, error) {
	return s.requirements[grade], nil
}
func (s *goldenGenStore) teacherName(_ context.Context, id uuid.UUID) (string, error) {
	return s.names[id], nil
}
func (s *goldenGenStore) availability(_ context.Context, teacher, _ uuid.UUID) ([]generationAvailability, error) {
	return s.unavailable[teacher], nil
}
func (s *goldenGenStore) labsForSubject(_ context.Context, subject uuid.UUID) ([]Classroom, error) {
	return s.labs[subject], nil
}
func (s *goldenGenStore) create(_ context.Context, _, class, _ uuid.UUID, _ *uuid.UUID) (Timetable, error) {
	s.nextID++
	id := fixedID(9000 + s.nextID)
	s.log = append(s.log, fmt.Sprintf("create %s for %s", id, class))
	return Timetable{ID: id, ClassID: class}, nil
}
func (s *goldenGenStore) upsertGeneratedEntry(_ context.Context, tt uuid.UUID, day, period int16, subject, teacher uuid.UUID, room *uuid.UUID) error {
	r := "-"
	if room != nil {
		r = room.String()[24:]
	}
	s.log = append(s.log, fmt.Sprintf("entry %s d%d p%d subj %s teacher %s room %s", tt.String()[24:], day, period, subject.String()[24:], teacher.String()[24:], r))
	return nil
}
func (s *goldenGenStore) optionBlocks(context.Context, []uuid.UUID) ([]OptionBlock, error) {
	return s.blocks, nil
}
func (s *goldenGenStore) upsertBlockEntry(_ context.Context, tt uuid.UUID, day, period int16, block uuid.UUID) error {
	s.log = append(s.log, fmt.Sprintf("block %s d%d p%d %s", tt.String()[24:], day, period, block.String()[24:]))
	return nil
}

func goldenScenario() *goldenGenStore {
	n := func(v int32) *int32 { return &v }
	grade10, grade11 := fixedID(10), fixedID(11)
	cA, cB, cC, cD, cE := fixedID(101), fixedID(102), fixedID(103), fixedID(104), fixedID(105)
	roomA, roomB, lab1, lab2 := fixedID(201), fixedID(202), fixedID(203), fixedID(204)
	maths, science, english, music, art, sinhala, pe := fixedID(301), fixedID(302), fixedID(303), fixedID(304), fixedID(305), fixedID(306), fixedID(307)
	tMaths, tSci, tEng, tMusic, tArt, tForm, tPE := fixedID(401), fixedID(402), fixedID(403), fixedID(404), fixedID(405), fixedID(406), fixedID(407)
	form := tForm
	shared := []generationTeacherSubject{
		{SubjectID: maths, TeacherID: tMaths, TeacherName: "Maths T"},
		{SubjectID: science, TeacherID: tSci, TeacherName: "Science T"},
		{SubjectID: english, TeacherID: tEng, TeacherName: "English T"},
		{SubjectID: music, TeacherID: tMusic, TeacherName: "Music T"},
		{SubjectID: art, TeacherID: tArt, TeacherName: "Art T"},
		{SubjectID: pe, TeacherID: tPE, TeacherName: "PE T"},
	}
	return &goldenGenStore{
		classes: []generationClass{
			{ID: cA, GradeID: grade10, Name: "10-A", HomeClassroomID: &roomA, FormTeacherID: &form},
			{ID: cB, GradeID: grade10, Name: "10-B", HomeClassroomID: &roomB},
			{ID: cC, GradeID: grade10, Name: "10-C"},
			{ID: cD, GradeID: grade11, Name: "11-A", FormTeacherID: &form},
			{ID: cE, GradeID: grade11, Name: "11-B"},
		},
		latest: map[uuid.UUID][]TimetableListItem{
			cC: {{Timetable: Timetable{ID: fixedID(501), Status: statusDraft}}},
			cE: {{Timetable: Timetable{ID: fixedID(502), Status: "published"}}},
		},
		bookings: []generationBusy{
			{Day: 1, Period: 1, TeacherID: &tMaths, ClassName: "9-A"},
			{Day: 2, Period: 3, ClassroomID: &lab1, ClassName: "9-B"},
			{Day: 3, Period: 2, TeacherID: &tSci, ClassroomID: &lab2, ClassName: "9-C"},
		},
		periodGrid: []generationPeriod{
			{Number: n(1), SlotType: "period"}, {Number: n(2), SlotType: "period"}, {SlotType: "interval"},
			{Number: n(3), SlotType: "period"}, {Number: n(4), SlotType: "period"},
		},
		teachers: map[uuid.UUID][]generationTeacherSubject{
			cA: shared, cB: shared, cC: shared[:4], cD: shared,
		},
		requirements: map[uuid.UUID][]generationRequirement{
			grade10: {
				{SubjectID: maths, SubjectName: "Maths", Periods: 6, DoubleBlocks: 1},
				{SubjectID: science, SubjectName: "Science", Periods: 4, LabPeriods: 2, DoubleBlocks: 1},
				{SubjectID: english, SubjectName: "English", Periods: 3},
				{SubjectID: music, SubjectName: "Music", Periods: 2},
				{SubjectID: art, SubjectName: "Art", Periods: 2},
				{SubjectID: sinhala, SubjectName: "Sinhala", Periods: 3},
				{SubjectID: pe, SubjectName: "PE", Periods: 2},
			},
			grade11: {
				{SubjectID: maths, SubjectName: "Maths", Periods: 5},
				{SubjectID: science, SubjectName: "Science", Periods: 3, LabPeriods: 3},
				{SubjectID: sinhala, SubjectName: "Sinhala", Periods: 2},
			},
		},
		names:       map[uuid.UUID]string{tForm: "Form T"},
		unavailable: map[uuid.UUID][]generationAvailability{tEng: {{Day: 1, Period: 1}, {Day: 1, Period: 2}, {Day: 5, Period: 4}}, tMaths: {{Day: 5, Period: 1}}},
		labs:        map[uuid.UUID][]Classroom{science: {{ID: lab1}, {ID: lab2}}},
		blocks: []OptionBlock{
			{ID: fixedID(601), GradeID: grade10, Name: "Aesthetics", Periods: 2, Subjects: []uuid.UUID{music, art}, Classes: []uuid.UUID{cA, cB}},
			{ID: fixedID(602), GradeID: grade11, Name: "Partial", Periods: 1, Subjects: []uuid.UUID{pe}, Classes: []uuid.UUID{cD, cE}},
		},
	}
}

func TestGenerateGolden(t *testing.T) {
	store := goldenScenario()
	result, err := (&generationService{store: store}).generate(context.Background(), GenerationRequest{GradeSectionID: fixedID(1), AcademicYearID: fixedID(2)}, fixedID(3))
	if err != nil {
		t.Fatal(err)
	}
	got, _ := json.MarshalIndent(struct {
		Result GenerationResult
		Writes []string
	}{result, store.log}, "", "  ")
	path := "testdata/generate.golden.json"
	if *updateGolden {
		if err := os.MkdirAll("testdata", 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, got, 0o644); err != nil {
			t.Fatal(err)
		}
	}
	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(want) {
		t.Fatalf("generation output changed; run with -update if intended\n%s", got)
	}
}

// repairScenario leaves one lesson with no common free period, so the repair pass must move another class's lesson.
func repairScenario() *goldenGenStore {
	one := int32(1)
	grade := fixedID(20)
	q, p := fixedID(121), fixedID(122)
	subA, subB, subC := fixedID(321), fixedID(322), fixedID(323)
	t1, t2 := fixedID(421), fixedID(422)
	return &goldenGenStore{
		classes:    []generationClass{{ID: q, GradeID: fixedID(21), Name: "Q"}, {ID: p, GradeID: grade, Name: "P"}},
		periodGrid: []generationPeriod{{Number: &one, SlotType: "period"}},
		teachers: map[uuid.UUID][]generationTeacherSubject{
			q: {{SubjectID: subC, TeacherID: t2}},
			p: {{SubjectID: subA, TeacherID: t1}, {SubjectID: subB, TeacherID: t2}},
		},
		requirements: map[uuid.UUID][]generationRequirement{
			fixedID(21): {{SubjectID: subC, SubjectName: "C", Periods: 4}},
			grade:       {{SubjectID: subA, SubjectName: "A", Periods: 4}, {SubjectID: subB, SubjectName: "B", Periods: 1}},
		},
	}
}

func TestGenerateRepairGolden(t *testing.T) {
	store := repairScenario()
	result, err := (&generationService{store: store}).generate(context.Background(), GenerationRequest{GradeSectionID: fixedID(1), AcademicYearID: fixedID(2)}, fixedID(3))
	if err != nil {
		t.Fatal(err)
	}
	for _, c := range result.Classes {
		if len(c.Gaps) != 0 || c.Placed != c.Required {
			t.Fatalf("%s: placed %d of %d, gaps %v", c.ClassName, c.Placed, c.Required, c.Gaps)
		}
	}
	got, _ := json.MarshalIndent(store.log, "", "  ")
	path := "testdata/generate_repair.golden.json"
	if *updateGolden {
		if err := os.WriteFile(path, got, 0o644); err != nil {
			t.Fatal(err)
		}
	}
	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(want) {
		t.Fatalf("repair output changed; run with -update if intended\n%s", got)
	}
}
