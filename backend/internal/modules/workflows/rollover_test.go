package workflows

import (
	"testing"

	"github.com/google/uuid"
)

func TestRolloverDefaults(t *testing.T) {
	cur := Year{ID: uuid.New(), Label: "2026", Current: true}
	other := Year{ID: uuid.New(), Label: "2025"}

	source, label, start, end := rolloverDefaults([]Year{other, cur})
	if source != cur.ID.String() || label != "2027" || start != "2027-01-01" || end != "2027-12-31" {
		t.Fatalf("numeric year: got %q %q %q %q", source, label, start, end)
	}

	named := Year{ID: uuid.New(), Label: "Year A", Current: true}
	source, label, start, end = rolloverDefaults([]Year{named})
	if source != named.ID.String() || label != "" || start != "" || end != "" {
		t.Fatalf("non-numeric label should only default the source: got %q %q %q %q", source, label, start, end)
	}

	if source, label, _, _ := rolloverDefaults([]Year{other}); source != "" || label != "" {
		t.Fatalf("no current year should leave everything blank: got %q %q", source, label)
	}
}

func TestRolloverStepsReadBeforeTheyWrite(t *testing.T) {
	steps := YearRollover{}.Steps()
	seenApply := false
	for _, s := range steps {
		if s.Phase == "apply" {
			seenApply = true
		} else if seenApply {
			t.Fatalf("propose step %q comes after an apply step", s.Key)
		}
	}
	if steps[len(steps)-1].Key != "copy_timetable_setup" {
		t.Fatalf("last step = %q, want copy_timetable_setup", steps[len(steps)-1].Key)
	}
}
