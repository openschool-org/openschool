package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterHouseRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewHouseRepository(pool)
	service := services.NewHouseService(repo)
	handler := handlers.NewHouseHandler(service)

	admin.POST("/houses", handler.Create)
	teacherOrAdmin.GET("/houses", handler.List)
	teacherOrAdmin.GET("/houses/:id", handler.GetByID)
	admin.PUT("/houses/:id", handler.Update)
	admin.DELETE("/houses/:id", handler.Delete)
	admin.POST("/houses/reassign-missing", handler.ReassignMissing)
}
