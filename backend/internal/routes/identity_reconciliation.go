package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterIdentityReconciliationRoutes(admin *gin.RouterGroup, pool *pgxpool.Pool) {
	auditSvc := services.NewAuditService(repositories.NewAuditRepository(pool))
	service := services.NewIdentityReconciliationService(newIdentityProvider(), repositories.NewUserRepository(pool), auditSvc)
	handler := handlers.NewIdentityReconciliationHandler(service)

	admin.GET("/admin/orphaned-accounts", handler.ListOrphaned)
	admin.DELETE("/admin/orphaned-accounts/:id", handler.DeleteOrphaned)
}
