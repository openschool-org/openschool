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

// RateLimit throttles requests per client IP with a token-bucket limiter.
// Originally written for a single unauthenticated, state-changing endpoint
// (first-run admin registration) — now also used API-wide (see
// cmd/api/main.go), so unlike a single low-traffic route, the set of
// distinct client IPs here can grow into the thousands over a school day.
// A background sweep evicts limiters idle for more than evictAfter so
// memory tracks *active* clients, not every IP ever seen since the process
// started.
func RateLimit(rps float64, burst int) gin.HandlerFunc {
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
		if !limiterFor(c.ClientIP()).Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many requests. Please wait a moment and try again.",
			})
			return
		}
		c.Next()
	}
}
