package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// evictAfter is how long an idle key's limiter is kept before eviction; generous relative to sweepInterval so a client polling every few minutes isn't evicted mid-session.
const evictAfter = 30 * time.Minute

// sweepInterval is how often the eviction pass runs.
const sweepInterval = 10 * time.Minute

// maxKeyLength bounds the size of any one limiter key. Without this, a
// caller-controlled identifier (PerJSONFieldRateLimit reads one straight out
// of the request body) could retain up to the body size limit per key for
// the whole evictAfter window.
const maxKeyLength = 254

// maxLimiterEntries bounds how many distinct keys are tracked at once,
// regardless of key length, so a single source can't grow the map without
// bound between sweeps by cycling through many distinct identifiers.
const maxLimiterEntries = 20000

// limiterEntry pairs one key's token bucket with when it was last used, so the sweep goroutine knows what's idle.
type limiterEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// evictOldestLocked drops the least-recently-seen entry so the map can accept
// a new key without growing past maxLimiterEntries between sweeps. Caller
// must hold the map's mutex.
func evictOldestLocked(limiters map[string]*limiterEntry) {
	var oldestKey string
	var oldestSeen time.Time
	first := true
	for key, e := range limiters {
		if first || e.lastSeen.Before(oldestSeen) {
			oldestKey, oldestSeen, first = key, e.lastSeen, false
		}
	}
	if !first {
		delete(limiters, oldestKey)
	}
}

// keyedRateLimit is the shared token-bucket-per-key implementation behind RateLimit and PerAccountRateLimit; keyFunc returning "" skips limiting (e.g. no signed-in subject yet).
func keyedRateLimit(rps float64, burst int, keyFunc func(*gin.Context) string) gin.HandlerFunc {
	var mu sync.Mutex
	limiters := make(map[string]*limiterEntry)

	limiterFor := func(key string) *rate.Limiter {
		mu.Lock()
		defer mu.Unlock()
		e, ok := limiters[key]
		if !ok {
			if len(limiters) >= maxLimiterEntries {
				evictOldestLocked(limiters)
			}
			e = &limiterEntry{limiter: rate.NewLimiter(rate.Limit(rps), burst)}
			limiters[key] = e
		}
		e.lastSeen = time.Now()
		return e.limiter
	}

	go func() {
		ticker := time.NewTicker(sweepInterval)
		defer ticker.Stop()
		for range ticker.C {
			cutoff := time.Now().Add(-evictAfter)
			mu.Lock()
			for key, e := range limiters {
				if e.lastSeen.Before(cutoff) {
					delete(limiters, key)
				}
			}
			mu.Unlock()
		}
	}()

	return func(c *gin.Context) {
		key := keyFunc(c)
		if key == "" {
			c.Next()
			return
		}
		if !limiterFor(key).Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many requests. Please wait a moment and try again.",
			})
			return
		}
		c.Next()
	}
}

// RateLimit throttles requests per client IP with a token-bucket limiter, applied API-wide (cmd/api/main.go) so the set of distinct IPs can grow into the thousands over a school day.
func RateLimit(rps float64, burst int) gin.HandlerFunc {
	return keyedRateLimit(rps, burst, func(c *gin.Context) string {
		return c.ClientIP()
	})
}

// PerAccountRateLimit throttles requests per signed-in JWT subject, isolating one abusive account from the rest of a school that may share one NAT IP; must run after AuthMiddleware so "userID" is set.
func PerAccountRateLimit(rps float64, burst int) gin.HandlerFunc {
	return keyedRateLimit(rps, burst, func(c *gin.Context) string {
		return c.GetString("userID")
	})
}

// maxPeekBytes caps how much of the body the per-field limiter reads; the
// login-style bodies it guards are a few hundred bytes.
const maxPeekBytes = 4 << 10

// PerJSONFieldRateLimit throttles requests keyed by a top-level string field
// in the JSON body (case-insensitively), e.g. the "identifier" on
// /auth/forgot-password (S2): a per-IP limiter alone is either useless
// (every user shares one IP behind the school's Nginx) or, once IPs are
// resolved correctly, still lets an attacker spread guesses for one target
// account across many IPs. This limiter targets the account instead. The
// body is peeked and restored so the handler's own binding still works.
func PerJSONFieldRateLimit(rps float64, burst int, field string) gin.HandlerFunc {
	limit := keyedRateLimit(rps, burst, func(c *gin.Context) string {
		return c.GetString(jsonFieldKey)
	})
	return func(c *gin.Context) {
		body, err := io.ReadAll(io.LimitReader(c.Request.Body, maxPeekBytes+1))
		if err != nil || len(body) > maxPeekBytes {
			c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, gin.H{"error": "request body too large"})
			return
		}
		c.Request.Body = io.NopCloser(bytes.NewReader(body))
		// A request without the field is refused here: an empty key would mean
		// "no limit", which a padded or re-cased body could otherwise reach (S1).
		key, ok := jsonStringField(body, field)
		if !ok {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
			return
		}
		c.Set(jsonFieldKey, key)
		limit(c)
	}
}

const jsonFieldKey = "ratelimit_json_field"

// jsonStringField finds a top-level string field by name, ignoring case the
// way encoding/json does when the handler binds the same body, and tolerating
// other fields of any type.
func jsonStringField(body []byte, field string) (string, bool) {
	var payload map[string]json.RawMessage
	if err := json.Unmarshal(body, &payload); err != nil {
		return "", false
	}
	for name, raw := range payload {
		if !strings.EqualFold(name, field) {
			continue
		}
		var value string
		if err := json.Unmarshal(raw, &value); err != nil {
			return "", false
		}
		key := strings.ToLower(strings.TrimSpace(value))
		if key == "" {
			return "", false
		}
		if len(key) > maxKeyLength {
			key = key[:maxKeyLength]
		}
		return key, true
	}
	return "", false
}
