package auth

import (
	"errors"
	"strings"
)

// ErrWeakPassword is returned when a new password is on the common-password
// deny list or matches the account's own NIC/index number (S1). The initial
// password IS the NIC or index number, and both are printed on documents
// other students see, so accepting them back as a "new" password would
// leave the account exactly as guessable as before.
var ErrWeakPassword = errors.New("that password is too common or matches information printed on your ID card — choose a different one")

// ErrPasswordTooShort is returned when a new password is under
// MinPasswordLength.
var ErrPasswordTooShort = errors.New("password must be at least 10 characters")

// MinPasswordLength mirrors the `min=10` request-binding tags on
// ResetPasswordRequest/ChangePasswordRequest (models.go). setPassword
// enforces it again here so any caller reaching the shared setter directly
// — not just the two HTTP request shapes that carry that tag today — can't
// bypass the minimum length.
const MinPasswordLength = 10

// commonPasswords is a small deny list of the most-guessed passwords and
// keyboard patterns, mirroring frontend/src/shared/auth/password.ts so a
// direct API call can't bypass the client-side check. It is intentionally
// small rather than a full top-10k breached-password corpus — that lives in
// the client-side strength meter, which can afford the extra download size.
var commonPasswords = map[string]struct{}{
	"password": {}, "password1": {}, "password123": {}, "12345678": {},
	"123456789": {}, "1234567890": {}, "qwertyuiop": {}, "qwerty123": {},
	"letmein123": {}, "welcome123": {}, "admin1234": {}, "iloveyou1": {},
	"sunshine1": {}, "princess1": {}, "football1": {}, "monkey123": {},
	"abc1234567": {}, "1qaz2wsx3e": {}, "trustno1a": {}, "changeme1": {},
	"schoolschool": {}, "teacher123": {}, "student123": {}, "welcome1234": {},
}

func isCommonPassword(password string) bool {
	_, ok := commonPasswords[strings.ToLower(password)]
	return ok
}

// ValidateNewPassword applies the length and deny-list rules to any flow that sets a password outside this module.
func ValidateNewPassword(password string) error {
	if len(password) < MinPasswordLength {
		return ErrPasswordTooShort
	}
	if isCommonPassword(password) {
		return ErrWeakPassword
	}
	return nil
}
