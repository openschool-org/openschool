// Package identity owns authenticated account identity and password lifecycle use cases.
package identity

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	idp "github.com/openschool-org/openschool/internal/idp"
	"github.com/openschool-org/openschool/internal/ports"
)

// Register mounts identity-owned endpoints and constructs their private dependencies.
func Register(protected *gin.RouterGroup, pool *pgxpool.Pool) {
	repository := newUserRepository(pool)
	handler := newMeHandler(newMeService(repository))
	protected.GET("/me", handler.get)
	protected.PUT("/me/language", handler.setLanguage)
}

// RegisterReconciliation mounts the admin-only orphaned-account operations.
func RegisterReconciliation(admin *gin.RouterGroup, pool *pgxpool.Pool, provider idp.Provider, audit ports.AuditRecorder) {
	handler := newReconciliationHandler(newReconciliationService(provider, newUserRepository(pool), audit))
	admin.GET("/admin/orphaned-accounts", handler.listOrphaned)
	admin.DELETE("/admin/orphaned-accounts/:id", handler.deleteOrphaned)
}
