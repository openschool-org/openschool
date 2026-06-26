package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
	"github.com/openschool-org/openschool/internal/thunderid"
)

func RegisterStudentRoutes(r *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewStudentRepository(pool)
	thunderIDClient := thunderid.NewClient()
	service := services.NewStudentService(repo, thunderIDClient)
	handler := handlers.NewStudentHandler(service)

	r.POST("/students", handler.Create)
	r.GET("/students", handler.List)
	r.GET("/students/:id", handler.GetByID)
	r.GET("/students/:id/class", handler.GetWithClass)
	r.PUT("/students/:id", handler.Update)
	r.GET("/classes/:id/students", handler.ListByClass)
	r.DELETE("/students/:id", handler.Delete)

}
