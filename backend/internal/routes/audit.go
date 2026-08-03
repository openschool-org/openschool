package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterAuditRoutes(admin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewAuditRepository(pool)
	service := services.NewAuditService(repo)
	handler := handlers.NewAuditHandler(service)

	admin.GET("/audit-logs", handler.List)
}
