package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterStreamRoutes(r *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewStreamRepository(pool)
	service := services.NewStreamService(repo)
	handler := handlers.NewStreamHandler(service)

	r.POST("/streams", handler.Create)
	r.GET("/streams", handler.List)
	r.GET("/streams/:id", handler.GetByID)
	r.PUT("/streams/:id", handler.Update)
	r.DELETE("/streams/:id", handler.Delete)

	r.POST("/streams/:id/groups", handler.CreateGroup)
	r.GET("/streams/:id/groups", handler.ListGroups)
	r.GET("/streams/:id/groups/:groupId", handler.GetGroupByID)
	r.PUT("/streams/:id/groups/:groupId", handler.UpdateGroup)
	r.DELETE("/streams/:id/groups/:groupId", handler.DeleteGroup)
}
