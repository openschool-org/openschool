// Package names handles Sri Lankan personal names, which don't split into "first" and "last":
// a full name (often ge name + given names + surname), a name with initials such as
// "H.A.H.E. Wickramasinghe" for registers and reports, and an optional calling name.
package names

import (
	"strings"
	"unicode"
)

// words splits a name on spaces and dots, keeping the dots with the initials they follow.
func words(full string) []string {
	return strings.Fields(strings.ReplaceAll(full, ".", ". "))
}

// initialOf returns a word's first letter, upper-cased.
func initialOf(word string) string {
	for _, r := range word {
		if unicode.IsLetter(r) {
			return string(unicode.ToUpper(r))
		}
	}
	return ""
}

// WithInitials suggests the name with initials: an initial for every word except the last, then the
// last word, e.g. "Hettiwatta Arachchige Hasitha Erandika Wickramasinghe" -> "H.A.H.E. Wickramasinghe".
// Admins can edit it, which matters for names whose last word is not a surname.
func WithInitials(full string) string {
	ws := words(full)
	switch len(ws) {
	case 0:
		return ""
	case 1:
		return ws[0]
	}
	var b strings.Builder
	for _, w := range ws[:len(ws)-1] {
		if i := initialOf(w); i != "" {
			b.WriteString(i + ".")
		}
	}
	last := strings.TrimSuffix(ws[len(ws)-1], ".")
	if b.Len() == 0 {
		return last
	}
	return b.String() + " " + last
}

// Normalize trims and collapses spaces; an empty name with initials falls back to the suggestion.
func Normalize(full, withInitials, calling string) (string, string, string) {
	full = strings.Join(strings.Fields(full), " ")
	withInitials = strings.Join(strings.Fields(withInitials), " ")
	if withInitials == "" {
		withInitials = WithInitials(full)
	}
	return full, withInitials, strings.Join(strings.Fields(calling), " ")
}

// Surname is the last word of the name, used where a system insists on a family name.
func Surname(full string) string {
	ws := words(full)
	if len(ws) == 0 {
		return ""
	}
	return strings.TrimSuffix(ws[len(ws)-1], ".")
}

// ForIdentityProvider fills the identity provider's required given and family names without
// guessing a split: the calling name (or the initials) as given name and the surname as family name.
func ForIdentityProvider(full, withInitials, calling string) (given, family string) {
	full, withInitials, calling = Normalize(full, withInitials, calling)
	family = Surname(full)
	given = calling
	if given == "" {
		given = strings.TrimSpace(strings.TrimSuffix(withInitials, Surname(withInitials)))
	}
	if given == "" {
		given = full
	}
	if family == "" {
		family = given
	}
	return given, family
}

// signature is a name's surname and its initials in order, e.g. ("perera", "HAS").
func signature(name string) (string, string) {
	ws := words(name)
	if len(ws) == 0 {
		return "", ""
	}
	var initials strings.Builder
	for _, w := range ws[:len(ws)-1] {
		initials.WriteString(initialOf(w))
	}
	return strings.ToLower(Surname(name)), initials.String()
}

// isSubsequence reports whether every letter of short appears in long, in order.
func isSubsequence(short, long string) bool {
	i := 0
	for j := 0; i < len(short) && j < len(long); j++ {
		if short[i] == long[j] {
			i++
		}
	}
	return i == len(short)
}

// SamePerson reports whether two spellings can be one person: the same surname, and the initials of
// one appearing in order within the other. So "Sunil Perera", "S. Perera" and "H.A. Sunil Perera"
// match each other, while "Kamal Perera" and "Sunil Silva" do not.
func SamePerson(a, b string) bool {
	surnameA, initialsA := signature(a)
	surnameB, initialsB := signature(b)
	if surnameA == "" || surnameA != surnameB {
		return false
	}
	if len(initialsA) > len(initialsB) {
		initialsA, initialsB = initialsB, initialsA
	}
	return isSubsequence(initialsA, initialsB)
}
