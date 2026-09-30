package validation

import "testing"

func TestNormalizeSriLankanPhoneAcceptsCommonForms(t *testing.T) {
	for in, want := range map[string]string{
		"0777356618":        "0777356618",
		"+94777256678":      "0777256678",
		"94777256678":       "0777256678", // spreadsheet dropped the +
		"777356618":         "0777356618", // spreadsheet dropped the leading 0
		"0094 77 725 6678":  "0777256678",
		"077-735-6618":      "0777356618",
		"(011) 234 5678":    "0112345678",
		" +94 11 234 5678 ": "0112345678",
		"":                  "",
	} {
		got, ok := NormalizeSriLankanPhone(in)
		if !ok || got != want {
			t.Errorf("NormalizeSriLankanPhone(%q) = %q, %v; want %q", in, got, ok, want)
		}
	}
}

func TestNormalizeSriLankanPhoneRejectsOthers(t *testing.T) {
	for _, in := range []string{"12345", "07773566181", "+1 555 123 4567", "7.77356618E+08", "077 735 661a", "077+7356618", "0000"} {
		if got, ok := NormalizeSriLankanPhone(in); ok {
			t.Errorf("NormalizeSriLankanPhone(%q) = %q, want rejected", in, got)
		}
	}
}

func TestNormalizePhoneFieldLeavesInvalidInputAlone(t *testing.T) {
	good, bad := "+94777256678", "12345"
	if !NormalizePhoneField(&good) || good != "0777256678" {
		t.Fatalf("good = %q", good)
	}
	if NormalizePhoneField(&bad) || bad != "12345" {
		t.Fatalf("bad = %q", bad)
	}
}
