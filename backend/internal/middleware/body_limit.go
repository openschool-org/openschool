package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// MaxRequestBodyBytes caps request body size; Gin applies no cap by default, so without this a client can POST an arbitrarily large body (bypassing the frontend's client-side check) and consume memory/bandwidth unbounded.
const MaxRequestBodyBytes = 5 << 20 // 5 MiB

// BodySizeLimit wraps the request body in an http.MaxBytesReader so a read past the limit fails instead of buffering unbounded data; applies API-wide.
func BodySizeLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxRequestBodyBytes)
		c.Next()
	}
}
