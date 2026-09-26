package workflows

import (
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestAllocateKeepsContinuityAndRespectsLimit(t *testing.T) {
	maths, music, art := uuid.New(), uuid.New(), uuid.New()
	grade := uuid.New()
	ana := TeacherInfo{ID: uuid.New(), Name: "Ana", Subjects: map[uuid.UUID]bool{maths: true}}
	ben := TeacherInfo{ID: uuid.New(), Name: "Ben", Subjects: map[uuid.UUID]bool{maths: true, music: true}}
	needs := []AllocNeed{
		{ClassID: uuid.New(), ClassName: "10-A", GradeID: grade, SubjectID: maths, SubjectName: "Maths", Periods: 6, Continuity: ben.ID, PreviousClass: "9-A"},
		{ClassID: uuid.New(), ClassName: "10-B", GradeID: grade, SubjectID: maths, SubjectName: "Maths", Periods: 6},
		{ClassID: uuid.New(), ClassName: "10-A", GradeID: grade, SubjectID: music, SubjectName: "Music", Periods: 3},
		{ClassID: uuid.New(), ClassName: "10-B", GradeID: grade, SubjectID: music, SubjectName: "Music", Periods: 3},
		{ClassID: uuid.New(), ClassName: "10-A", GradeID: grade, SubjectID: art, SubjectName: "Art", Periods: 2},
	}
	for run := 0; run < 3; run++ { // deterministic across runs
		got, load := Allocate(needs, []TeacherInfo{ben, ana}, 12)
		// Music has one qualified teacher, so Ben takes both Music classes first (6 periods).
		if got[2].TeacherID != ben.ID || got[3].TeacherID != ben.ID {
			t.Fatalf("music: %+v", got)
		}
		// Ben taught 10-A's students maths and still fits (6 + 6 = 12).
		if got[0].TeacherID != ben.ID || !strings.Contains(got[0].Reason, "9-A") {
			t.Fatalf("continuity: %+v", got[0])
		}
		// Ben is now at the limit, so 10-B maths goes to Ana.
		if got[1].TeacherID != ana.ID {
			t.Fatalf("limit: %+v", got[1])
		}
		if got[4].TeacherID != uuid.Nil || !strings.Contains(got[4].Warning, "No teacher is qualified for Art") {
			t.Fatalf("unfilled: %+v", got[4])
		}
		if load[ben.ID] != 12 || load[ana.ID] != 6 {
			t.Fatalf("load: %v", load)
		}
	}
}

func TestAllocateKeepsExistingAssignments(t *testing.T) {
	maths := uuid.New()
	ana := TeacherInfo{ID: uuid.New(), Subjects: map[uuid.UUID]bool{}}
	got, load := Allocate([]AllocNeed{{SubjectID: maths, Periods: 5, Existing: ana.ID}}, []TeacherInfo{ana}, 1)
	if got[0].TeacherID != ana.ID || load[ana.ID] != 5 {
		t.Fatalf("existing assignment should be kept even past the limit: %+v %v", got, load)
	}
}
