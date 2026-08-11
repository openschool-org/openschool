package services

import (
	"fmt"
	"strconv"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// parseOptionalUUID maps an empty string to a NULL uuid.
func parseOptionalUUID(s string) (pgtype.UUID, error) {
	if s == "" {
		return pgtype.UUID{}, nil
	}
	id, err := uuid.Parse(s)
	if err != nil {
		return pgtype.UUID{}, err
	}
	return pgtype.UUID{Bytes: id, Valid: true}, nil
}

// pgUUID wraps a known uuid as a non-NULL pgtype.UUID.
func pgUUID(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

func uuidString(v pgtype.UUID) *string {
	if !v.Valid {
		return nil
	}
	s := uuid.UUID(v.Bytes).String()
	return &s
}

func textString(v pgtype.Text) *string {
	if !v.Valid {
		return nil
	}
	s := v.String
	return &s
}

func optionalText(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: s != ""}
}

// optionalInt4 maps a nil pointer to a NULL int.
func optionalInt4(v *int32) pgtype.Int4 {
	if v == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: *v, Valid: true}
}

// pgNumeric converts a plain float (e.g. a mark out of 100) to pgtype.Numeric.
// pgtype.Numeric only scans from a string, not a float, hence the detour.
func pgNumeric(v float64) (pgtype.Numeric, error) {
	var n pgtype.Numeric
	if err := n.Scan(strconv.FormatFloat(v, 'f', 2, 64)); err != nil {
		return pgtype.Numeric{}, fmt.Errorf("failed to convert %v to numeric: %w", v, err)
	}
	return n, nil
}

// numericToFloat64 is pgNumeric's inverse — used for aggregate query results
// (e.g. AVG(...)) which come back NULL (zero rows) rather than zero.
func numericToFloat64(n pgtype.Numeric) float64 {
	f, err := n.Float64Value()
	if err != nil || !f.Valid {
		return 0
	}
	return f.Float64
}
