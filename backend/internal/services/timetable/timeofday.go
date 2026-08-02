package timetable

import (
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// parseClockTime parses "HH:MM" (or "HH:MM:SS") into a pgtype.Time. Used
// throughout the timetable module, whose settings/periods/intervals are all
// times-of-day rather than full timestamps.
func parseClockTime(s string) (pgtype.Time, error) {
	t, err := time.Parse("15:04", s)
	if err != nil {
		t, err = time.Parse("15:04:05", s)
		if err != nil {
			return pgtype.Time{}, fmt.Errorf("invalid time %q, expected HH:MM", s)
		}
	}
	micros := int64(t.Hour()*3600+t.Minute()*60+t.Second()) * 1_000_000
	return pgtype.Time{Microseconds: micros, Valid: true}, nil
}

// formatClockTime renders a pgtype.Time as "HH:MM" for JSON responses;
// pgtype.Time has no built-in JSON marshaling.
func formatClockTime(t pgtype.Time) string {
	if !t.Valid {
		return ""
	}
	total := t.Microseconds / 1_000_000
	h := total / 3600
	m := (total % 3600) / 60
	return fmt.Sprintf("%02d:%02d", h, m)
}
