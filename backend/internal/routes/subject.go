package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterSubjectRoutes(r *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewSubjectRepository(pool)
	service := services.NewSubjectService(repo)
	handler := handlers.NewSubjectHandler(service)

	r.POST("/subjects", handler.Create)
	r.GET("/subjects", handler.List)
	r.GET("/subjects/:id", handler.GetByID)
	r.PUT("/subjects/:id", handler.Update)
	r.DELETE("/subjects/:id", handler.Delete)
}
