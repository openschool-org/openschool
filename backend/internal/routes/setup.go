package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

// RegisterSetupRoutes wires the unauthenticated first-run bootstrap
// endpoints. They must stay outside the protected group: there is no admin
// yet to hold a token when they're needed.
func RegisterSetupRoutes(public *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewUserRepository(pool)
	service := services.NewSetupService(repo, newIdentityProvider())
	handler := handlers.NewSetupHandler(service)

	public.GET("/setup/status", handler.Status)
	// Unauthenticated by necessity (no admin exists yet to hold a token) —
	// rate-limited so it can't be used to hammer the identity provider or
	// spam-create accounts before setup completes.
	public.POST("/setup/admin", middleware.RateLimit(1, 3), handler.RegisterAdmin)
}
