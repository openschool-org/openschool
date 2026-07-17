package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/asgardeo"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterTeacherRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewTeacherRepository(pool)
	asgardeoClient := asgardeo.NewClient()
	service := services.NewTeacherService(repo, asgardeoClient)
	handler := handlers.NewTeacherHandler(service)

	admin.POST("/teachers", handler.Create)
	teacherOrAdmin.GET("/teachers", handler.List)
	teacherOrAdmin.GET("/teachers/:id", handler.GetByID)
	admin.PUT("/teachers/:id", handler.Update)
	admin.DELETE("/teachers/:id", handler.Delete)
	admin.POST("/teachers/:id/subjects", handler.AssignSubject)
	admin.DELETE("/teachers/:id/subjects/:subject_id", handler.RemoveSubject)
	teacherOrAdmin.GET("/teachers/:id/subjects", handler.ListSubjects)
}
