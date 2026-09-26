package workflows

import (
	"fmt"
	"math/rand"
	"reflect"
	"testing"
)

func students(n int, mk func(i int) PlacementStudent) []PlacementStudent {
	out := make([]PlacementStudent, n)
	for i := range out {
		out[i] = mk(i)
		if out[i].ID == "" {
			out[i].ID = fmt.Sprintf("s%03d", i)
		}
	}
	return out
}

func byClass(ps []Placement) map[string]int {
	out := map[string]int{}
	for _, p := range ps {
		out[p.ClassID]++
	}
	return out
}

func TestPlaceIsDeterministicWhateverTheInputOrder(t *testing.T) {
	in := students(80, func(i int) PlacementStudent {
		return PlacementStudent{Gender: []string{"male", "female"}[i%2], HouseID: fmt.Sprintf("h%d", i%4)}
	})
	classes := []PlacementClass{{ID: "a", Name: "7-A", Capacity: 45}, {ID: "b", Name: "7-B", Capacity: 45}}
	first, _ := Place(in, classes, PolicyBalanced, false, "2027", 45)
	shuffled := append([]PlacementStudent(nil), in...)
	rand.New(rand.NewSource(7)).Shuffle(len(shuffled), func(i, j int) { shuffled[i], shuffled[j] = shuffled[j], shuffled[i] })
	second, _ := Place(shuffled, classes, PolicyBalanced, false, "2027", 45)
	if !reflect.DeepEqual(first, second) {
		t.Fatal("same inputs in a different order gave a different placement")
	}
}

func TestKeepSectionFollowsTheLetterAndOverflowsWithAReason(t *testing.T) {
	in := students(50, func(i int) PlacementStudent {
		cls := "6-A"
		if i >= 40 {
			cls = "6-B"
		}
		return PlacementStudent{CurrentClass: cls}
	})
	classes := []PlacementClass{{ID: "a", Name: "7-A", Capacity: 35}, {ID: "b", Name: "7-B", Capacity: 45}}
	out, added := Place(in, classes, PolicyKeepSection, false, "2027", 45)
	counts := byClass(out)
	if counts["a"] != 35 || counts["b"] != 15 || len(added) != 0 {
		t.Fatalf("counts = %v, added = %v", counts, added)
	}
	for _, p := range out {
		if p.Reason == "" {
			t.Fatalf("placement without a reason: %+v", p)
		}
	}
}

func TestMediumIsRespectedAndFallsBackWithAWarning(t *testing.T) {
	in := []PlacementStudent{{ID: "tamil", MediumID: "ta"}, {ID: "sinhala", MediumID: "si"}, {ID: "none"}}
	classes := []PlacementClass{{ID: "ta7", Name: "7-A", MediumID: "ta", Capacity: 45}, {ID: "gen", Name: "7-B", Capacity: 45}}
	out, _ := Place(in, classes, PolicyBalanced, false, "x", 45)
	got := map[string]Placement{}
	for _, p := range out {
		got[p.StudentID] = p
	}
	if got["tamil"].ClassID != "ta7" || got["none"].ClassID != "gen" {
		t.Fatalf("medium not respected: %+v", got)
	}
	if got["sinhala"].ClassID != "gen" || got["sinhala"].Warning == "" {
		t.Fatalf("a student with no class in their medium should fall back with a warning: %+v", got["sinhala"])
	}
}

func TestBalancedSplitsSizeAndGenderEvenly(t *testing.T) {
	in := students(90, func(i int) PlacementStudent {
		return PlacementStudent{Gender: []string{"male", "female"}[i%2]}
	})
	classes := []PlacementClass{{ID: "a", Name: "7-A", Capacity: 45}, {ID: "b", Name: "7-B", Capacity: 45}}
	out, _ := Place(in, classes, PolicyBalanced, false, "seed", 45)
	boys := map[string]int{}
	for _, p := range out {
		var s PlacementStudent
		for _, x := range in {
			if x.ID == p.StudentID {
				s = x
			}
		}
		if s.Gender == "male" {
			boys[p.ClassID]++
		}
	}
	if c := byClass(out); c["a"] != 45 || c["b"] != 45 {
		t.Fatalf("sizes = %v", c)
	}
	if d := boys["a"] - boys["b"]; d < -1 || d > 1 {
		t.Fatalf("boys per class = %v", boys)
	}
}

func TestSubjectChoiceKeepsCombinationsTogether(t *testing.T) {
	combos := []string{"commerce+music", "geography+art", "ict+dance"}
	sizes := []int{40, 25, 20}
	var in []PlacementStudent
	for c, combo := range combos {
		for i := 0; i < sizes[c]; i++ {
			in = append(in, PlacementStudent{ID: fmt.Sprintf("%s-%02d", combo, i), ChoiceKey: combo, ChoiceLabel: combo})
		}
	}
	classes := []PlacementClass{{ID: "a", Name: "10-A", Capacity: 45}, {ID: "b", Name: "10-B", Capacity: 45}}
	out, added := Place(in, classes, PolicyBySubjectChoice, false, "2027", 45)
	if len(added) != 0 {
		t.Fatalf("85 students fit in 90 places; no class should be added: %v", added)
	}
	spread := map[string]map[string]bool{}
	for _, p := range out {
		combo := p.StudentID[:len(p.StudentID)-3]
		if spread[combo] == nil {
			spread[combo] = map[string]bool{}
		}
		spread[combo][p.ClassID] = true
	}
	if len(spread["commerce+music"]) != 1 {
		t.Fatalf("the largest combination should stay in one class: %v", spread)
	}
	split := 0
	for _, classes := range spread {
		if len(classes) > 1 {
			split++
		}
	}
	if split > 1 {
		t.Fatalf("at most one combination should need splitting, got %d: %v", split, spread)
	}
}

func TestOverflowAddsTheNextSection(t *testing.T) {
	in := students(50, func(int) PlacementStudent { return PlacementStudent{} })
	out, added := Place(in, []PlacementClass{{ID: "a", Name: "7-A", Capacity: 45}}, PolicyBalanced, false, "s", 45)
	if len(added) != 1 || added[0].Name != "7-B" || added[0].ID != "new:7-B" {
		t.Fatalf("added = %+v", added)
	}
	if c := byClass(out); c["a"] != 45 || c["new:7-B"] != 5 {
		t.Fatalf("counts = %v", c)
	}
}

func TestByStreamNeedsAStream(t *testing.T) {
	in := []PlacementStudent{{ID: "bio", StreamID: "sci", StreamGroupID: "bio"}, {ID: "maths", StreamID: "sci", StreamGroupID: "maths"}, {ID: "unknown"}}
	classes := []PlacementClass{
		{ID: "b1", Name: "12-B1", StreamID: "sci", StreamGroupID: "bio", Capacity: 45},
		{ID: "m1", Name: "12-M1", StreamID: "sci", StreamGroupID: "maths", Capacity: 45},
	}
	out, _ := Place(in, classes, PolicyByStream, false, "s", 45)
	got := map[string]Placement{}
	for _, p := range out {
		got[p.StudentID] = p
	}
	if got["bio"].ClassID != "b1" || got["maths"].ClassID != "m1" {
		t.Fatalf("stream placement wrong: %+v", got)
	}
	if got["unknown"].ClassID != "" || got["unknown"].Warning == "" {
		t.Fatalf("a student without a stream must be left for a person: %+v", got["unknown"])
	}
}

func TestSpreadByMarksSnakesTheTopRanks(t *testing.T) {
	in := students(6, func(i int) PlacementStudent { return PlacementStudent{Marks: float64(100 - i), HasMarks: true} })
	classes := []PlacementClass{{ID: "a", Name: "7-A", Capacity: 45}, {ID: "b", Name: "7-B", Capacity: 45}, {ID: "c", Name: "7-C", Capacity: 45}}
	out, _ := Place(in, classes, PolicyBalanced, true, "s", 45)
	got := map[string]string{}
	for _, p := range out {
		got[p.StudentID] = p.ClassID
	}
	// Ranks 1-3 go A, B, C and ranks 4-6 come back C, B, A.
	want := map[string]string{"s000": "a", "s001": "b", "s002": "c", "s003": "c", "s004": "b", "s005": "a"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %v, want %v", got, want)
	}
}

func TestNextSectionName(t *testing.T) {
	cases := []struct {
		existing []string
		want     string
	}{
		{[]string{"7-A", "7-B"}, "7-C"},
		{[]string{"12-S1", "12-S2"}, "12-S3"},
		{[]string{"7-A", "7-C"}, "7-D"},
	}
	for _, c := range cases {
		if got := nextSectionName(c.existing, c.existing[len(c.existing)-1]); got != c.want {
			t.Errorf("nextSectionName(%v) = %s, want %s", c.existing, got, c.want)
		}
	}
	if !naturalLess("7-B", "7-10") || !naturalLess("12-S2", "12-S10") || naturalLess("7-C", "7-B") {
		t.Error("naturalLess ordering is wrong")
	}
}
