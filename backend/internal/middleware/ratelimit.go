package middleware

import (
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// RateLimit throttles requests per client IP with a token-bucket limiter.
// It's meant for unauthenticated, state-changing endpoints (e.g. first-run
// admin registration) that have no auth check in front of them to otherwise
// stop someone from hammering the identity provider or the database.
//
// The per-IP limiter map is never evicted; for a self-hosted app at this
// scale that's an acceptable tradeoff, but it isn't meant for a
// high-cardinality public deployment.
func RateLimit(rps float64, burst int) gin.HandlerFunc {
	var mu sync.Mutex
	limiters := make(map[string]*rate.Limiter)

	limiterFor := func(key string) *rate.Limiter {
		mu.Lock()
		defer mu.Unlock()
		l, ok := limiters[key]
		if !ok {
			l = rate.NewLimiter(rate.Limit(rps), burst)
			limiters[key] = l
		}
		return l
	}

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
