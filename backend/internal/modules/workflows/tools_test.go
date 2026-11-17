package workflows

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func yearAt(year int, current bool) Year {
	return Year{ID: uuid.New(), Start: time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC), Current: current}
}

func TestYearDefaults(t *testing.T) {
	past, cur, next := yearAt(2025, false), yearAt(2026, true), yearAt(2027, false)

	// Rows arrive newest first, as WfListAcademicYears returns them.
	gotCur, gotNext := yearDefaults([]Year{next, cur, past})
	if gotCur != cur.ID.String() || gotNext != next.ID.String() {
		t.Fatalf("got %s, %s", gotCur, gotNext)
	}

	gotCur, gotNext = yearDefaults([]Year{cur, past})
	if gotCur != cur.ID.String() || gotNext != "" {
		t.Fatalf("no next year: got %s, %s", gotCur, gotNext)
	}

	gotCur, gotNext = yearDefaults([]Year{next, past})
	if gotCur != "" || gotNext != "" {
		t.Fatalf("no current year: got %s, %s", gotCur, gotNext)
	}
}
