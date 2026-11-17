package workflows

import (
	"testing"
	"time"

	"github.com/google/uuid"

	timetablemodule "github.com/openschool-org/openschool/internal/modules/timetable"
)

func TestDefaultTargetYearPrefersALaterYear(t *testing.T) {
	jan := func(y int) time.Time { return time.Date(y, 1, 1, 0, 0, 0, 0, time.UTC) }
	past := Year{ID: uuid.New(), Start: jan(2025)}
	cur := Year{ID: uuid.New(), Start: jan(2026), Current: true}
	next := Year{ID: uuid.New(), Start: jan(2027)}

	if got := defaultTargetYear([]Year{past, cur, next}); got == nil || got.ID != next.ID {
		t.Fatalf("want the later year, got %+v", got)
	}
	if got := defaultTargetYear([]Year{past, cur}); got == nil || got.ID != cur.ID {
		t.Fatalf("want the current year when none is later, got %+v", got)
	}
	if got := defaultTargetYear([]Year{past}); got != nil {
		t.Fatalf("want nil without a current year, got %+v", got)
	}
}

func TestStatusLabel(t *testing.T) {
	for in, want := range map[string]string{"": "no timetable", "under_review": "under review", "draft": "draft"} {
		if got := statusLabel(in); got != want {
			t.Errorf("statusLabel(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestGapSummaryListsThreeThenCounts(t *testing.T) {
	gaps := []timetablemodule.GenerationGap{
		{SubjectName: "Maths", Reason: "no teacher"},
		{Reason: "no room"},
		{SubjectName: "Art", Reason: "too many periods"},
		{SubjectName: "Music", Reason: "x"},
		{SubjectName: "Drama", Reason: "y"},
	}
	want := "Maths: no teacher; Timetable: no room; Art: too many periods; and 2 more."
	if got := gapSummary(gaps); got != want {
		t.Fatalf("gapSummary = %q, want %q", got, want)
	}
	if got := gapSummary(gaps[:1]); got != "Maths: no teacher." {
		t.Fatalf("single gap = %q", got)
	}
}

func TestSectionSet(t *testing.T) {
	a, b := uuid.New(), uuid.New()
	set := sectionSet([]SectionInfo{{ID: a}, {ID: b}, {ID: a}})
	if len(set) != 2 || !set[a] || !set[b] {
		t.Fatalf("unexpected set %v", set)
	}
}
