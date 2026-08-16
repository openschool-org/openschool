package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterSearchRoutes(admin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewSearchRepository(pool)
	service := services.NewSearchService(repo)
	handler := handlers.NewSearchHandler(service)

	admin.GET("/admin/search", handler.Global)
}
