package auth

import (
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRegisterRoutesPreservesPublicAndProtectedEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	api := router.Group("/api/v1")
	RegisterRoutes(api, api, nil, guardianStub{}, &passwordUpdaterStub{}, &mailerStub{})

	want := map[string]bool{
		"POST /api/v1/auth/forgot-password":       true,
		"POST /api/v1/auth/reset-password":        true,
		"POST /api/v1/auth/change-password":       true,
		"POST /api/v1/auth/keep-default-password": true,
	}
	for _, route := range router.Routes() {
		delete(want, route.Method+" "+route.Path)
	}
	if len(want) != 0 {
		t.Fatalf("missing auth routes: %v", want)
	}
}
