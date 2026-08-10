package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterDashboardRoutes(admin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewDashboardRepository(pool)
	service := services.NewDashboardService(repo)
	handler := handlers.NewDashboardHandler(service)

	admin.GET("/dashboard/analytics", handler.Analytics)
}
