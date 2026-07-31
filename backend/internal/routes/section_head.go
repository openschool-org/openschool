package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterSectionHeadRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewSectionHeadRepository(pool)
	service := services.NewSectionHeadService(repo)
	handler := handlers.NewSectionHeadHandler(service)

	admin.PUT("/section-heads", handler.Assign)
	teacherOrAdmin.GET("/section-heads", handler.List)
	admin.DELETE("/section-heads/:id", handler.Delete)
}
