package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// evictAfter is how long an idle key's limiter is kept before eviction; generous relative to sweepInterval so a client polling every few minutes isn't evicted mid-session.
const evictAfter = 30 * time.Minute

// sweepInterval is how often the eviction pass runs.
const sweepInterval = 10 * time.Minute

type limiterEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
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
