package workflows

import (
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestChoiceSlotsAndRules(t *testing.T) {
	music, art, dance, maths := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	core := ChoiceGroup{ID: uuid.New(), Label: "Core", Min: 1, Max: 1, Subjects: []Option{{Value: maths.String(), Label: "Maths"}}}
	basket := ChoiceGroup{ID: uuid.New(), Label: "Basket", Min: 1, Max: 2, Subjects: []Option{{Value: music.String(), Label: "Music"}, {Value: art.String(), Label: "Art"}, {Value: dance.String(), Label: "Dance"}}}
	groups := []ChoiceGroup{core, basket}

	if cols := choiceColumns(groups); len(cols) != 2 || cols[1].Label != "Basket 2 (optional)" {
		t.Fatalf("columns: %+v", cols)
	}
	cells := map[string]string{}
	if left := fillSlots(groups, cells, []uuid.UUID{music, art, dance, maths}); len(left) != 2 {
		t.Fatalf("a full basket and a fixed subject should be left over, got %d", len(left))
	}
	if problems := choiceProblems(groups, picksFromCells(groups, cells)); len(problems) != 0 {
		t.Fatalf("two basket picks are valid: %v", problems)
	}
	if problems := choiceProblems(groups, map[uuid.UUID][]string{}); len(problems) != 1 || !strings.Contains(problems[0], "Basket needs 1 to 2, has 0") {
		t.Fatalf("empty basket: %v", problems)
	}
	dup := map[uuid.UUID][]string{basket.ID: {music.String(), music.String()}}
	if problems := choiceProblems(groups, dup); len(problems) != 1 || !strings.Contains(problems[0], "Music is picked twice") {
		t.Fatalf("duplicate: %v", problems)
	}
}

func TestParseChoicesCSV(t *testing.T) {
	got, err := parseChoicesCSV("Index Number,Level,Subjects\n10/1,O/L,Music; Art\n,,\n10/2,,ART|dance\n")
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 || got["10/1"].level != "O/L" || len(got["10/2"].subjects) != 2 || got["10/2"].line != 4 {
		t.Fatalf("%+v", got)
	}
	if _, err := parseChoicesCSV("index_number,name\n"); err == nil {
		t.Fatal("a CSV without a subjects column should be refused")
	}
}
