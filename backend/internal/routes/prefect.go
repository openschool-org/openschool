package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterPrefectRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewPrefectRepository(pool)
	service := services.NewPrefectService(repo)
	handler := handlers.NewPrefectHandler(service)

	admin.PUT("/prefects", handler.Assign)
	teacherOrAdmin.GET("/prefects", handler.List)
	admin.DELETE("/prefects/:id", handler.Delete)
}
