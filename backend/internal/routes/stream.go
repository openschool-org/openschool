package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterStreamRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewStreamRepository(pool)
	service := services.NewStreamService(repo)
	handler := handlers.NewStreamHandler(service)

	admin.POST("/streams", handler.Create)
	teacherOrAdmin.GET("/streams", handler.List)
	teacherOrAdmin.GET("/streams/:id", handler.GetByID)
	admin.PUT("/streams/:id", handler.Update)
	admin.DELETE("/streams/:id", handler.Delete)

	admin.POST("/streams/:id/groups", handler.CreateGroup)
	teacherOrAdmin.GET("/streams/:id/groups", handler.ListGroups)
	teacherOrAdmin.GET("/streams/:id/groups/:groupId", handler.GetGroupByID)
	admin.PUT("/streams/:id/groups/:groupId", handler.UpdateGroup)
	admin.DELETE("/streams/:id/groups/:groupId", handler.DeleteGroup)
}
