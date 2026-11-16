package middleware

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// bufferedResponseWriter captures the response body so CacheReference can
// hash it into an ETag after the handler runs, instead of before the body
// exists.
type bufferedResponseWriter struct {
	gin.ResponseWriter
	buf *bytes.Buffer
}

func (w *bufferedResponseWriter) Write(b []byte) (int, error) {
	return w.buf.Write(b)
}

// CacheReference sets Cache-Control and ETag on rarely-changing reference
// data (grades, subjects, mediums, houses — section 5's delivery checklist).
// A 304 short-circuits the body entirely when the client's cached copy is
// still current. maxAge 0 means "no-cache": the browser keeps its copy but
// asks every time, so an admin's new grade shows at once (E12) while an
// unchanged list still costs only a 304.
func CacheReference(maxAge int) gin.HandlerFunc {
	cacheControl := "private, no-cache"
	if maxAge > 0 {
		cacheControl = "private, max-age=" + strconv.Itoa(maxAge)
	}
	return func(c *gin.Context) {
		buf := &bytes.Buffer{}
		writer := &bufferedResponseWriter{ResponseWriter: c.Writer, buf: buf}
		c.Writer = writer
		c.Next()

		if c.Writer.Status() != http.StatusOK {
			writer.ResponseWriter.WriteHeader(c.Writer.Status())
			_, _ = writer.ResponseWriter.Write(buf.Bytes())
			return
		}

		sum := sha256.Sum256(buf.Bytes())
		etag := `"` + hex.EncodeToString(sum[:]) + `"`

		writer.ResponseWriter.Header().Set("Cache-Control", cacheControl)
		writer.ResponseWriter.Header().Set("ETag", etag)

		if match := c.GetHeader("If-None-Match"); match == etag {
			writer.ResponseWriter.WriteHeader(http.StatusNotModified)
			return
		}

		writer.ResponseWriter.WriteHeader(http.StatusOK)
		_, _ = writer.ResponseWriter.Write(buf.Bytes())
	}
}
