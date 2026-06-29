package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
	"github.com/openschool-org/openschool/internal/thunderid"
)

func RegisterStudentRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewStudentRepository(pool)
	thunderIDClient := thunderid.NewClient()
	service := services.NewStudentService(repo, thunderIDClient)
	handler := handlers.NewStudentHandler(service)

	admin.POST("/students", handler.Create)
	admin.GET("/students", handler.List)
	admin.GET("/students/:id", handler.GetByID)
	admin.GET("/students/:id/class", handler.GetWithClass)
	admin.PUT("/students/:id", handler.Update)
	admin.DELETE("/students/:id", handler.Delete)

	teacherOrAdmin.GET("/classes/:id/students", handler.ListByClass)

	// Subject selections
	selRepo := repositories.NewStudentSubjectSelectionRepository(pool)
	selService := services.NewStudentSubjectSelectionService(selRepo)
	selHandler := handlers.NewStudentSubjectSelectionHandler(selService)

	admin.POST("/students/:id/selections", selHandler.UpsertSelection)
	admin.GET("/students/:id/selections", selHandler.ListSelections)
	admin.DELETE("/students/:id/selections/:bucket_id", selHandler.DeleteSelection)

}
