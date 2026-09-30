package activation

import (
	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/middleware"
)

// RegisterRoutes puts the self-service steps on the unauthenticated group and code management on admin.
func RegisterRoutes(public, admin *gin.RouterGroup, service *Service) {
	h := NewHandler(service)

	// Per-IP limits plus per-code and per-identifier hourly limits, so guesses
	// spread across many IPs are still caught.
	public.GET("/activation/status", middleware.RateLimit(2, 10), h.Status)
	public.POST("/activation/start", middleware.RateLimit(1, 5),
		middleware.PerJSONFieldRateLimit(5.0/3600, 5, "code"),
		middleware.PerJSONFieldRateLimit(5.0/3600, 5, "identifier"),
		h.Start)
	public.POST("/activation/complete", middleware.RateLimit(1, 5), h.Complete)

	admin.GET("/activation/settings", h.GetSettings)
	admin.PUT("/activation/settings", h.UpdateSettings)
	admin.POST("/activation/codes", h.Generate)
	admin.GET("/activation/batches", h.Batches)
	admin.GET("/activation/batches/:id/codes", h.BatchCodes)
	admin.POST("/activation/batches/:id/revoke", h.RevokeBatch)
}
