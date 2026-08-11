package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// MaxRequestBodyBytes caps how large a request body Gin will read before
// erroring out. Gin applies no cap by default, so without this a client can
// POST an arbitrarily large body (e.g. a multi-MB logo_url string sent
// directly to the API, bypassing the frontend's client-side size check
// entirely) and consume memory/bandwidth unbounded.
const MaxRequestBodyBytes = 5 << 20 // 5 MiB

// BodySizeLimit wraps the request body in an http.MaxBytesReader so any
// read past the limit fails instead of buffering unbounded data. Applies
// API-wide; individual handlers that genuinely need larger uploads should
// override per-route rather than raising this default.
func BodySizeLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxRequestBodyBytes)
		c.Next()
	}
}
