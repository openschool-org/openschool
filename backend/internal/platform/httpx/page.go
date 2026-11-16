package httpx

import (
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
)

// Pagination bounds shared by every list endpoint's contract
// (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md section 4.1).
const (
	DefaultPageLimit = 25
	MaxPageLimit     = 100
	MaxSearchLength  = 64
)

// PageParams is the validated shape of the limit/offset/search query
// parameters a paginated list endpoint reads.
type PageParams struct {
	Limit  int32
	Offset int32
	Search string
}

// ParsePage reads limit/offset/search from the request's query string.
// limit defaults to DefaultPageLimit and is clamped to [1, MaxPageLimit];
// offset is clamped to >= 0; search is trimmed, capped at MaxSearchLength
// and has LIKE wildcards escaped so it's safe to interpolate into an
// `ILIKE '%'||search||'%'` clause — a bare "%" or "_" would otherwise widen
// the match arbitrarily, and one "%" alone would scan the whole table.
func ParsePage(c *gin.Context) PageParams {
	limit := int32(DefaultPageLimit)
	if v, err := strconv.ParseInt(c.Query("limit"), 10, 32); err == nil && v > 0 {
		limit = int32(v)
	}
	if limit > MaxPageLimit {
		limit = MaxPageLimit
	}

	var offset int32
	// ParseInt with a 32-bit size rejects anything outside int32's range
	// outright, rather than truncating: an offset like 2147483648 fits in a
	// 64-bit int on most hosts, so a bare int(v) cast here would silently
	// wrap negative and send Postgres a negative OFFSET.
	if v, err := strconv.ParseInt(c.Query("offset"), 10, 32); err == nil && v > 0 {
		offset = int32(v)
	}

	search := strings.TrimSpace(c.Query("search"))
	if len(search) > MaxSearchLength {
		search = search[:MaxSearchLength]
		// Truncating by byte index can split a multi-byte UTF-8 character;
		// back off until the result is valid again so it doesn't reach
		// Postgres as invalid encoding.
		for !utf8.ValidString(search) {
			search = search[:len(search)-1]
		}
	}

	return PageParams{Limit: limit, Offset: offset, Search: EscapeLikeTerm(search)}
}

// EscapeLikeTerm neutralises ILIKE's own wildcards ('%', '_') and its
// escape character ('\') in user input bound for an ILIKE pattern.
func EscapeLikeTerm(term string) string {
	replacer := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return replacer.Replace(term)
}

// Page wraps one page of items with the metadata the frontend's DataGrid
// server mode needs — never a bare array, so `total` can travel with it.
type Page[T any] struct {
	Items  []T   `json:"items"`
	Total  int64 `json:"total"`
	Limit  int32 `json:"limit"`
	Offset int32 `json:"offset"`
}

// SortParams is a validated sort column and direction for a list endpoint.
type SortParams struct {
	Key  string
	Desc bool
}

// ParseSort reads ?sort=<key>&order=asc|desc. Keys outside allowed are
// ignored, so the query falls back to its default order rather than
// letting a client pick an arbitrary column.
func ParseSort(c *gin.Context, allowed ...string) SortParams {
	key := c.Query("sort")
	for _, a := range allowed {
		if key == a {
			return SortParams{Key: key, Desc: c.Query("order") == "desc"}
		}
	}
	return SortParams{}
}

// ListPage fetches one page whose rows carry COUNT(*) OVER () as their total.
// An offset past the last page returns no rows, so it re-probes at offset 0 to keep the total right.
func ListPage[T any](limit, offset int32, list func(limit, offset int32) ([]T, error), total func(T) int64) (Page[T], error) {
	rows, err := list(limit, offset)
	if err != nil {
		return Page[T]{}, err
	}
	page := Page[T]{Items: rows, Limit: limit, Offset: offset}
	if len(rows) > 0 {
		page.Total = total(rows[0])
		return page, nil
	}
	if offset == 0 {
		return page, nil
	}
	probe, err := list(1, 0)
	if err != nil {
		return Page[T]{}, err
	}
	if len(probe) > 0 {
		page.Total = total(probe[0])
	}
	return page, nil
}
