package validation

import (
	"errors"
	"strings"
)

// ErrInvalidPhone is returned when a phone number is not a Sri Lankan number in any accepted form.
var ErrInvalidPhone = errors.New("phone number must be a valid Sri Lankan number (e.g. 0771234567, 0112345678, or +94771234567)")

// NormalizeSriLankanPhone returns the number in the stored form 0XXXXXXXXX. It accepts spaces, dashes,
// dots and brackets, +94 / 0094 / 94 prefixes, and a 9-digit number whose leading 0 a spreadsheet dropped.
// Empty stays empty and is valid, since most phone fields are optional.
func NormalizeSriLankanPhone(s string) (string, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return "", true
	}
	var b strings.Builder
	for i, r := range s {
		switch {
		case r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '+' && i == 0:
		case r == ' ' || r == '-' || r == '.' || r == '(' || r == ')':
		default:
			return "", false
		}
	}
	digits := b.String()
	switch {
	case len(digits) == 10 && digits[0] == '0':
		return digits, true
	case len(digits) == 11 && strings.HasPrefix(digits, "94"):
		return "0" + digits[2:], true
	case len(digits) == 13 && strings.HasPrefix(digits, "0094"):
		return "0" + digits[4:], true
	case len(digits) == 9 && digits[0] != '0':
		return "0" + digits, true
	}
	return "", false
}

// IsValidSriLankanPhone reports whether s is empty or a Sri Lankan number in any accepted form.
func IsValidSriLankanPhone(s string) bool {
	_, ok := NormalizeSriLankanPhone(s)
	return ok
}

// NormalizePhoneField rewrites *p into the stored form and reports whether it was valid; *p is unchanged when invalid.
func NormalizePhoneField(p *string) bool {
	normalized, ok := NormalizeSriLankanPhone(*p)
	if ok {
		*p = normalized
	}
	return ok
}
