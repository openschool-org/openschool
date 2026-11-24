package academics

import (
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

func historyRow(year, term uuid.UUID, mark *uuid.UUID, subject string) markHistoryRow {
	row := markHistoryRow{AcademicYearID: year, AcademicYear: "2026", TermID: term, TermName: "Term"}
	if mark != nil {
		row.MarkID = pgtype.UUID{Bytes: *mark, Valid: true}
		row.SubjectName = pgtype.Text{String: subject, Valid: true}
	}
	return row
}

func TestGroupMarkHistoryNestsYearsAndTerms(t *testing.T) {
	y2026, y2025 := uuid.New(), uuid.New()
	t1, t2, t3 := uuid.New(), uuid.New(), uuid.New()
	m1, m2, m3 := uuid.New(), uuid.New(), uuid.New()

	years := groupMarkHistory([]markHistoryRow{
		historyRow(y2026, t1, &m1, "Chemistry"),
		historyRow(y2026, t1, &m2, "Physics"),
		historyRow(y2026, t2, nil, ""),
		historyRow(y2025, t3, &m3, "Chemistry"),
	})

	if len(years) != 2 {
		t.Fatalf("years = %d, want 2", len(years))
	}
	if got := len(years[0].Terms); got != 2 {
		t.Fatalf("2026 terms = %d, want 2", got)
	}
	if got := len(years[0].Terms[0].Marks); got != 2 {
		t.Fatalf("2026 term 1 marks = %d, want 2", got)
	}
	// A term without marks still appears, with an empty (not nil) list.
	if marks := years[0].Terms[1].Marks; marks == nil || len(marks) != 0 {
		t.Fatalf("empty term marks = %v, want []", marks)
	}
	if years[1].Terms[0].Marks[0].ID != m3 {
		t.Fatalf("2025 mark id mismatch")
	}
}

func TestGroupMarkHistoryEmpty(t *testing.T) {
	if years := groupMarkHistory(nil); years == nil || len(years) != 0 {
		t.Fatalf("got %v, want empty slice", years)
	}
}
