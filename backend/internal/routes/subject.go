package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterSubjectRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewSubjectRepository(pool)
	service := services.NewSubjectService(repo)
	handler := handlers.NewSubjectHandler(service)

	admin.POST("/subjects", handler.Create)
	teacherOrAdmin.GET("/subjects", handler.List)
	teacherOrAdmin.GET("/subjects/:id", handler.GetByID)
	admin.PUT("/subjects/:id", handler.Update)
	admin.DELETE("/subjects/:id", handler.Delete)
}
