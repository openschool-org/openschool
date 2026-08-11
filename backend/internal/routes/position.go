package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterPositionRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewPositionRepository(pool)
	sectionHeadRepo := repositories.NewSectionHeadRepository(pool)
	auditSvc := services.NewAuditService(repositories.NewAuditRepository(pool))
	service := services.NewPositionService(repo, sectionHeadRepo, auditSvc)
	handler := handlers.NewPositionHandler(service)

	admin.PUT("/positions/principal", handler.AssignPrincipal)
	admin.PUT("/positions/vice-principal", handler.AssignVicePrincipal)
	teacherOrAdmin.GET("/positions", handler.List)
	admin.DELETE("/positions/:id", handler.Delete)
}
