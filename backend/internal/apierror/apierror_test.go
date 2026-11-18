package apierror

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRespondInternalHidesErrorAndReturnsRequestID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/things/:id", func(c *gin.Context) {
		c.Set(RequestIDContextKey, "req-123")
		RespondInternal(c, errors.New(`relation "secret_table" does not exist`))
	})

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/things/1", nil))

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", w.Code)
	}
	if strings.Contains(w.Body.String(), "secret_table") {
		t.Fatalf("response leaked the internal error: %s", w.Body.String())
	}
	var body map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body["request_id"] != "req-123" || body["error"] == "" {
		t.Fatalf("unexpected body: %v", body)
	}
}

func TestRespondInternalWithoutRequestID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

	RespondInternal(c, errors.New("boom"))

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", w.Code)
	}
	if !strings.Contains(w.Body.String(), `"request_id":""`) {
		t.Fatalf("expected an empty request_id, got %s", w.Body.String())
	}
}
