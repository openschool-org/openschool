package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

// RegisterAuthRoutes wires the password lifecycle endpoints (Phase 8.3/8.4).
// ForgotPassword/ResetPassword must stay on the unauthenticated `public`
// group — by definition, a caller who needs them has no valid session.
// ChangePassword/KeepDefaultPassword require one, so they go on `protected`.
func RegisterAuthRoutes(public *gin.RouterGroup, protected *gin.RouterGroup, pool *pgxpool.Pool) {
	service := services.NewAuthService(
		repositories.NewUserRepository(pool),
		repositories.NewTeacherRepository(pool),
		repositories.NewStudentRepository(pool),
		repositories.NewGuardianRepository(pool),
		repositories.NewAuthRepository(pool),
		newIdentityProvider(),
	)
	handler := handlers.NewAuthHandler(service)

	// Rate-limited like /setup/admin — an unauthenticated endpoint that
	// checks a caller-supplied secret against an account must not be usable
	// to brute-force NIC/index numbers.
	public.POST("/auth/forgot-password", middleware.RateLimit(1, 5), handler.ForgotPassword)
	public.POST("/auth/reset-password", middleware.RateLimit(1, 5), handler.ResetPassword)

	protected.POST("/auth/change-password", handler.ChangePassword)
	protected.POST("/auth/keep-default-password", handler.KeepDefaultPassword)
}
