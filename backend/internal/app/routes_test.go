package app

import (
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSetupRegistersRoutesPreviouslyOwnedByCompatibilityBridge(t *testing.T) {
	// Unset APP_ENV counts as production, which needs a real mail provider.
	t.Setenv("APP_ENV", "development")
	gin.SetMode(gin.TestMode)
	router := gin.New()
	if scheduler := Setup(router, nil); scheduler == nil {
		t.Fatal("setup returned a nil automation scheduler")
	}

	want := map[string]bool{
		"GET /api/v1/curriculum/preset/preview":      true,
		"POST /api/v1/promotion/commit":              true,
		"PUT /api/v1/classes/:id/marks":              true,
		"POST /api/v1/students":                      true,
		"POST /api/v1/teachers":                      true,
		"POST /api/v1/guardians":                     true,
		"POST /api/v1/non-academic-staff":            true,
		"POST /api/v1/students/:id/progress-reports": true,
	}
	for _, route := range router.Routes() {
		delete(want, route.Method+" "+route.Path)
	}
	if len(want) != 0 {
		t.Fatalf("routes lost while removing compatibility bridge: %v", want)
	}
}
