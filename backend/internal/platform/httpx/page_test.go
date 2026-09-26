package httpx

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func parsePageFor(t *testing.T, rawQuery string) PageParams {
	t.Helper()
	gin.SetMode(gin.TestMode)
	request := httptest.NewRequest("GET", "/students?"+rawQuery, nil)
	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	context.Request = request
	return ParsePage(context)
}

func TestParsePageDefaults(t *testing.T) {
	got := parsePageFor(t, "")
	if got.Limit != DefaultPageLimit || got.Offset != 0 || got.Search != "" {
		t.Fatalf("ParsePage() = %+v, want defaults", got)
	}
}

func TestParsePageClampsLimitAndOffset(t *testing.T) {
	if got := parsePageFor(t, "limit=500&offset=10"); got.Limit != MaxPageLimit || got.Offset != 10 {
		t.Fatalf("ParsePage() = %+v, want limit clamped to %d", got, MaxPageLimit)
	}
	if got := parsePageFor(t, "limit=-5&offset=-5"); got.Limit != DefaultPageLimit || got.Offset != 0 {
		t.Fatalf("ParsePage() = %+v, want negative values ignored", got)
	}
	if got := parsePageFor(t, "limit=notanumber"); got.Limit != DefaultPageLimit {
		t.Fatalf("ParsePage() = %+v, want default limit on invalid input", got)
	}
}

func TestParsePageTruncatesAndEscapesSearch(t *testing.T) {
	long := strings.Repeat("a", MaxSearchLength+20)
	got := parsePageFor(t, "search="+long)
	if len(got.Search) != MaxSearchLength {
		t.Fatalf("search length = %d, want %d", len(got.Search), MaxSearchLength)
	}

	got = parsePageFor(t, "search=100%25")
	if got.Search != `100\%` {
		t.Fatalf("search = %q, want wildcard escaped", got.Search)
	}
}

func TestEscapeLikeTermEscapesAllWildcards(t *testing.T) {
	if got := EscapeLikeTerm(`50%_off\now`); got != `50\%\_off\\now` {
		t.Fatalf("EscapeLikeTerm() = %q", got)
	}
}
func parseSortFor(t *testing.T, rawQuery string) SortParams {
	t.Helper()
	gin.SetMode(gin.TestMode)
	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	context.Request = httptest.NewRequest("GET", "/students?"+rawQuery, nil)
	return ParseSort(context, "name", "index")
}

func TestParseSortAcceptsAllowedKeys(t *testing.T) {
	if got := parseSortFor(t, "sort=index&order=desc"); got.Key != "index" || !got.Desc {
		t.Fatalf("ParseSort() = %+v, want index desc", got)
	}
	if got := parseSortFor(t, "sort=name"); got.Key != "name" || got.Desc {
		t.Fatalf("ParseSort() = %+v, want name asc", got)
	}
}

func TestParseSortIgnoresUnknownKeys(t *testing.T) {
	if got := parseSortFor(t, "sort=password_hash&order=desc"); got != (SortParams{}) {
		t.Fatalf("ParseSort() = %+v, want the zero value for an unknown key", got)
	}
}
