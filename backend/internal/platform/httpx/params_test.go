package httpx

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestParamAndQueryUUID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	id := uuid.New()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/?year="+id.String(), nil)
	c.Params = gin.Params{{Key: "id", Value: id.String()}}
	if got, ok := ParamUUID(c, "id", "invalid id"); !ok || got != id {
		t.Fatalf("ParamUUID = %v, %v", got, ok)
	}
	if got, ok := QueryUUID(c, "year", "bad year"); !ok || got != id {
		t.Fatalf("QueryUUID = %v, %v", got, ok)
	}

	w = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
	c.Params = gin.Params{{Key: "id", Value: "nope"}}
	if _, ok := ParamUUID(c, "id", "invalid id"); ok {
		t.Fatal("ParamUUID accepted a bad id")
	}
	if w.Code != http.StatusBadRequest || w.Body.String() != `{"error":"invalid id"}` {
		t.Fatalf("response = %d %s", w.Code, w.Body.String())
	}
}
