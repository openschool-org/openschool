package activation

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"strings"
)

// codeAlphabet leaves out 0, O, 1, I and L so printed codes can't be misread.
const codeAlphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

// codeLength gives about 49 bits of entropy, enough behind rate limits, lockout and expiry.
const codeLength = 10

// newActivationCode returns a random code formatted as XXXXX-XXXXX.
func newActivationCode(random io.Reader) (string, error) {
	buf := make([]byte, codeLength)
	out := make([]byte, 0, codeLength)
	// Rejection sampling keeps every character equally likely.
	limit := byte(256 - 256%len(codeAlphabet))
	for len(out) < codeLength {
		if _, err := io.ReadFull(random, buf); err != nil {
			return "", fmt.Errorf("generate activation code: %w", err)
		}
		for _, b := range buf {
			if b < limit && len(out) < codeLength {
				out = append(out, codeAlphabet[int(b)%len(codeAlphabet)])
			}
		}
	}
	return string(out[:5]) + "-" + string(out[5:]), nil
}

// normalizeCode accepts codes typed with spaces, dashes or lower case.
func normalizeCode(code string) string {
	var b strings.Builder
	for _, r := range strings.ToUpper(code) {
		if strings.ContainsRune(codeAlphabet, r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// hashSecret is used for both codes and email tokens; both are random, so no salt is needed.
func hashSecret(secret string) string {
	sum := sha256.Sum256([]byte(secret))
	return hex.EncodeToString(sum[:])
}

// sameIdentifier compares index and NIC numbers without case or surrounding spaces.
func sameIdentifier(a, b string) bool {
	return a != "" && strings.EqualFold(strings.TrimSpace(a), strings.TrimSpace(b))
}
