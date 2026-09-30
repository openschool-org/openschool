package names

import "testing"

func TestWithInitials(t *testing.T) {
	for full, want := range map[string]string{
		"Hettiwatta Arachchige Hasitha Erandika Wickramasinghe": "H.A.H.E. Wickramasinghe",
		"H.A. Hasitha Erandika Wickramasinghe":                  "H.A.H.E. Wickramasinghe",
		"H.A.H.E. Wickramasinghe":                               "H.A.H.E. Wickramasinghe",
		"h.a.h.e wickramasinghe":                                "H.A.H.E. wickramasinghe",
		"  Nimali   Perera ":                                    "N. Perera",
		"K. Rajan":                                              "K. Rajan",
		"Fathima":                                               "Fathima",
		"":                                                      "",
	} {
		if got := WithInitials(full); got != want {
			t.Errorf("WithInitials(%q) = %q, want %q", full, got, want)
		}
	}
}

func TestNormalizeFillsMissingInitials(t *testing.T) {
	full, initials, calling := Normalize("  Hasitha   Wickramasinghe ", "", " Hasi ")
	if full != "Hasitha Wickramasinghe" || initials != "H. Wickramasinghe" || calling != "Hasi" {
		t.Fatalf("got %q %q %q", full, initials, calling)
	}
	if _, initials, _ := Normalize("Kumaran Rajan", "R. Kumaran", ""); initials != "R. Kumaran" {
		t.Fatal("an edited name with initials must be kept")
	}
}

func TestForIdentityProvider(t *testing.T) {
	cases := []struct{ full, initials, calling, given, family string }{
		{"Hettiwatta Arachchige Hasitha Erandika Wickramasinghe", "", "Hasitha", "Hasitha", "Wickramasinghe"},
		{"Hettiwatta Arachchige Hasitha Erandika Wickramasinghe", "", "", "H.A.H.E.", "Wickramasinghe"},
		{"Fathima", "", "", "Fathima", "Fathima"},
	}
	for _, c := range cases {
		if given, family := ForIdentityProvider(c.full, c.initials, c.calling); given != c.given || family != c.family {
			t.Errorf("ForIdentityProvider(%q) = %q %q, want %q %q", c.full, given, family, c.given, c.family)
		}
	}
}

func TestSamePerson(t *testing.T) {
	same := [][2]string{
		{"Sunil Perera", "S. Perera"},
		{"H.A. Sunil Perera", "Sunil Perera"},
		{"H.A.S. Perera", "Hettiwatta Arachchige Sunil Perera"},
		{"SUNIL  perera.", "Sunil Perera"},
	}
	for _, p := range same {
		if !SamePerson(p[0], p[1]) {
			t.Errorf("SamePerson(%q, %q) = false, want true", p[0], p[1])
		}
	}
	different := [][2]string{
		{"Kamal Perera", "Sunil Perera"},
		{"Sunil Silva", "Sunil Perera"},
		{"", "Sunil Perera"},
	}
	for _, p := range different {
		if SamePerson(p[0], p[1]) {
			t.Errorf("SamePerson(%q, %q) = true, want false", p[0], p[1])
		}
	}
}
