package auth

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/ports"
)

// RegisterRoutes wires the password lifecycle endpoints (Phase 8.3/8.4).
// ForgotPassword/ResetPassword must stay on the unauthenticated `public`
// group — by definition, a caller who needs them has no valid session.
// ChangePassword/KeepDefaultPassword require one, so they go on `protected`.
func RegisterRoutes(public, protected *gin.RouterGroup, pool *pgxpool.Pool, guardians ports.GuardianAuthenticator, provider PasswordUpdater, mail Emailer) {
	service := NewService(NewRepository(pool), guardians, provider, mail)
	handler := NewAuthHandler(service)

	// Rate-limited like /setup/admin — an unauthenticated endpoint that
	// checks a caller-supplied secret against an account must not be usable
	// to brute-force NIC/index numbers. Two limiters: per-IP (device) and
	// per-identifier/5-per-hour (account) — an attacker spreading guesses for
	// one target across many IPs is still caught by the second (S2).
	public.POST("/auth/forgot-password", middleware.RateLimit(1, 5), middleware.PerJSONFieldRateLimit(5.0/3600, 5, "identifier"), handler.ForgotPassword)
	public.POST("/auth/reset-password", middleware.RateLimit(1, 5), handler.ResetPassword)

	protected.POST("/auth/change-password", handler.ChangePassword)
	protected.POST("/auth/keep-default-password", handler.KeepDefaultPassword)
}
