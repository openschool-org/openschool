package automation

import (
	"context"
	"errors"
	"strings"
	"testing"
)

func TestCheckListSkipsNotifyWhenEmptyOrFailing(t *testing.T) {
	label := func(s string) string { return s }
	describe := func(int, string) finding {
		t.Fatal("describe must not run without rows")
		return finding{}
	}

	if out := checkList(context.Background(), nil, nil, "empty-grade", []string{}, nil, label, describe); out.err != nil || out.findings != 0 || out.label != "" {
		t.Fatalf("empty list: %+v", out)
	}

	boom := errors.New("boom")
	out := checkList(context.Background(), nil, nil, "empty-grade", []string(nil), boom, label, describe)
	if !errors.Is(out.err, boom) || !strings.HasPrefix(out.err.Error(), "empty-grade check: ") {
		t.Fatalf("query error: %+v", out)
	}
}
