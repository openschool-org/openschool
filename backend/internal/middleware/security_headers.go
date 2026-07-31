package middleware

import "github.com/gin-gonic/gin"

// SecurityHeaders sets a small set of defensive headers appropriate for a
// JSON-only API (no HTML is ever served here, so no CSP is needed).
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "same-origin")
		c.Next()
	}
}
