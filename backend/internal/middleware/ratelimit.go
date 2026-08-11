package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// evictAfter is how long a client IP can go without a request before its
// limiter is dropped. Generous relative to sweepInterval so a client
// polling every few minutes never gets evicted mid-session.
const evictAfter = 30 * time.Minute

// sweepInterval is how often the eviction pass runs.
const sweepInterval = 10 * time.Minute

type limiterEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// keyedRateLimit is the shared token-bucket-per-key implementation behind
// RateLimit (per client IP) and PerAccountRateLimit (per signed-in JWT
// subject). A background sweep evicts limiters idle for more than
// evictAfter so memory tracks *active* keys, not every one ever seen since
// the process started. keyFunc returning "" skips limiting for that
// request (e.g. no signed-in subject yet).
func keyedRateLimit(rps float64, burst int, keyFunc func(*gin.Context) string) gin.HandlerFunc {
	var mu sync.Mutex
	limiters := make(map[string]*limiterEntry)

	limiterFor := func(key string) *rate.Limiter {
		mu.Lock()
		defer mu.Unlock()
		e, ok := limiters[key]
		if !ok {
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

// RateLimit throttles requests per client IP with a token-bucket limiter.
// Originally written for a single unauthenticated, state-changing endpoint
// (first-run admin registration) — now also used API-wide (see
// cmd/api/main.go), so unlike a single low-traffic route, the set of
// distinct client IPs here can grow into the thousands over a school day.
func RateLimit(rps float64, burst int) gin.HandlerFunc {
	return keyedRateLimit(rps, burst, func(c *gin.Context) string {
		return c.ClientIP()
	})
}

// PerAccountRateLimit throttles requests per signed-in JWT subject, layered
// on top of the per-IP RateLimit in cmd/api/main.go. The per-IP limiter
// alone can't isolate one abusive signed-in account from the rest of a
// school sharing one NAT IP (it throttles everyone together); this fixes
// that by keying on the account instead. Must run after AuthMiddleware so
// "userID" is set — falls through unthrottled if it isn't (unauthenticated
// requests are already covered by the per-IP limiter).
func PerAccountRateLimit(rps float64, burst int) gin.HandlerFunc {
	return keyedRateLimit(rps, burst, func(c *gin.Context) string {
		return c.GetString("userID")
	})
}
