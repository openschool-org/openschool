package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterGradeRoutes(r *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewGradeRepository(pool)
	service := services.NewGradeService(repo)
	handler := handlers.NewGradeHandler(service)

	r.POST("/grades", handler.Create)
	r.GET("/grades", handler.List)
	r.GET("/grades/:id", handler.GetByID)
	r.PUT("/grades/:id", handler.Update)
	r.DELETE("/grades/:id", handler.Delete)
}
