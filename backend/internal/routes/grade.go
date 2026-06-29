package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterGradeRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewGradeRepository(pool)
	service := services.NewGradeService(repo)
	handler := handlers.NewGradeHandler(service)

	admin.POST("/grades", handler.Create)
	teacherOrAdmin.GET("/grades", handler.List)
	teacherOrAdmin.GET("/grades/:id", handler.GetByID)
	admin.PUT("/grades/:id", handler.Update)
	admin.DELETE("/grades/:id", handler.Delete)
}
