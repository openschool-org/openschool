package httpx

import (
	"errors"
	"testing"
)

type countedRow struct{ total int64 }

// fakeList serves `count` rows and records each call's limit and offset.
func fakeList(count int, calls *[][2]int32) func(limit, offset int32) ([]countedRow, error) {
	return func(limit, offset int32) ([]countedRow, error) {
		*calls = append(*calls, [2]int32{limit, offset})
		var rows []countedRow
		for i := int(offset); i < count && len(rows) < int(limit); i++ {
			rows = append(rows, countedRow{total: int64(count)})
		}
		return rows, nil
	}
}

func rowTotal(r countedRow) int64 { return r.total }

func TestListPageTakesTotalFromFirstRow(t *testing.T) {
	var calls [][2]int32
	page, err := ListPage(10, 0, fakeList(25, &calls), rowTotal)
	if err != nil || page.Total != 25 || len(page.Items) != 10 || page.Limit != 10 || page.Offset != 0 {
		t.Fatalf("got %+v, %v", page, err)
	}
	if len(calls) != 1 {
		t.Fatalf("expected one query, got %v", calls)
	}
}

func TestListPageReprobesPastLastPage(t *testing.T) {
	var calls [][2]int32
	page, err := ListPage(10, 50, fakeList(25, &calls), rowTotal)
	if err != nil || page.Total != 25 || len(page.Items) != 0 || page.Offset != 50 {
		t.Fatalf("got %+v, %v", page, err)
	}
	if len(calls) != 2 || calls[1] != [2]int32{1, 0} {
		t.Fatalf("expected a probe at limit 1 offset 0, got %v", calls)
	}
}

func TestListPageEmptyFirstPageSkipsProbe(t *testing.T) {
	var calls [][2]int32
	page, err := ListPage(10, 0, fakeList(0, &calls), rowTotal)
	if err != nil || page.Total != 0 || len(calls) != 1 {
		t.Fatalf("got %+v, %v, calls %v", page, err, calls)
	}
}

func TestListPageReturnsErrors(t *testing.T) {
	boom := errors.New("boom")
	_, err := ListPage(10, 0, func(int32, int32) ([]countedRow, error) { return nil, boom }, rowTotal)
	if !errors.Is(err, boom) {
		t.Fatalf("expected boom, got %v", err)
	}
	calls := 0
	_, err = ListPage(10, 5, func(int32, int32) ([]countedRow, error) {
		calls++
		if calls == 2 {
			return nil, boom
		}
		return nil, nil
	}, rowTotal)
	if !errors.Is(err, boom) {
		t.Fatalf("expected probe error, got %v", err)
	}
}
