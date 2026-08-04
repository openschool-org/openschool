package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterPromotionRoutes(admin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewPromotionRepository(pool)
	service := services.NewPromotionService(repo)
	handler := handlers.NewPromotionHandler(service)

	admin.GET("/promotion/preview", handler.Preview)
	admin.POST("/promotion/commit", handler.Commit)
}
