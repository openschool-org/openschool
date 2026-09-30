package workflows

import "testing"

func TestClassKeyMatchesCommonSpellings(t *testing.T) {
	for _, v := range []string{"6-A", "6A", "6 a", " Grade 6-A ", "grade 6 A"} {
		if classKey(v) != "6a" {
			t.Fatalf("classKey(%q) = %q", v, classKey(v))
		}
	}
	if classKey("6-B") == classKey("6-A") {
		t.Fatal("different classes must not match")
	}
}
