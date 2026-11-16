package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

// S1: padding the body with a non-string field, or changing the key's case,
// must not switch the per-account limit off.
func TestPerJSONFieldRateLimitCannotBeBypassed(t *testing.T) {
	gin.SetMode(gin.TestMode)
	bodies := map[string]string{
		"plain":       `{"identifier":"a@school.lk","secret":"x"}`,
		"padded":      `{"identifier":"a@school.lk","secret":"x","pad":1}`,
		"recased key": `{"Identifier":"a@school.lk","secret":"x"}`,
	}
	for name, body := range bodies {
		t.Run(name, func(t *testing.T) {
			router := gin.New()
			router.POST("/", PerJSONFieldRateLimit(0.0001, 2, "identifier"), func(c *gin.Context) { c.Status(http.StatusOK) })
			codes := make([]int, 3)
			for i := range codes {
				w := httptest.NewRecorder()
				router.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body)))
				codes[i] = w.Code
			}
			if codes[0] != http.StatusOK || codes[1] != http.StatusOK || codes[2] != http.StatusTooManyRequests {
				t.Fatalf("codes = %v, want [200 200 429]", codes)
			}
		})
	}
}

func TestPerJSONFieldRateLimitRejectsMissingField(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/", PerJSONFieldRateLimit(1, 5, "identifier"), func(c *gin.Context) { c.Status(http.StatusOK) })
	for _, body := range []string{`{"secret":"x"}`, `{"identifier":5}`, `not json`} {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body)))
		if w.Code != http.StatusBadRequest {
			t.Fatalf("body %s: status = %d, want 400", body, w.Code)
		}
	}
}
