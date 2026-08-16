// Package validation holds small, reusable field-format checks shared across
// services — not a general request-validation framework, just the handful of
// formats (starting with phone numbers) that need the same rule in more than
// one place.
package validation

import (
	"errors"
	"regexp"
)

// ErrInvalidPhone is returned by services when a phone number is present but
// doesn't match the Sri Lankan format.
var ErrInvalidPhone = errors.New("phone number must be a valid Sri Lankan number (e.g. 0771234567, 0112345678, or +94771234567)")

// sriLankanPhone matches a leading +94 or 0 followed by exactly 9 digits —
// the same shape covers both mobile numbers (07x...) and landlines with a
// 2-digit area code (011, 021, ... ), since Sri Lankan subscriber numbers are
// always a 2-digit prefix + 7 digits after the leading 0/+94.
var sriLankanPhone = regexp.MustCompile(`^(?:\+94|0)\d{9}$`)

// IsValidSriLankanPhone reports whether s is a validly formatted Sri Lankan
// phone number. An empty string is considered valid — most phone fields in
// this app are optional, so callers combine this with their own presence
// check wherever a phone number is actually required.
func IsValidSriLankanPhone(s string) bool {
	if s == "" {
		return true
	}
	return sriLankanPhone.MatchString(s)
}
