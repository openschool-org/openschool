package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/asgardeo"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterStudentRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewStudentRepository(pool)
	asgardeoClient := asgardeo.NewClient()
	service := services.NewStudentService(repo, asgardeoClient)
	handler := handlers.NewStudentHandler(service)

	admin.POST("/students", handler.Create)
	teacherOrAdmin.GET("/students", handler.List)
	teacherOrAdmin.GET("/students/:id", handler.GetByID)
	teacherOrAdmin.GET("/students/:id/class", handler.GetWithClass)
	admin.PUT("/students/:id", handler.Update)
	admin.DELETE("/students/:id", handler.Delete)

	teacherOrAdmin.GET("/classes/:id/students", handler.ListByClass)
}
