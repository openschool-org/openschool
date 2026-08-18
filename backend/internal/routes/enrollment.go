// This file defines the RegisterEnrollmentRoutes function, mapping student subject enrollment and validation endpoints to their handlers and middlewares.

package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterEnrollmentRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, studentAccess *gin.RouterGroup, protected *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewEnrollmentRepository(pool)
	curriculumRepo := repositories.NewCurriculumRepository(pool)
	service := services.NewEnrollmentService(repo, curriculumRepo)
	handler := handlers.NewEnrollmentHandler(service)

	admin.POST("/students/:id/enrollments", handler.Submit)
	admin.DELETE("/students/:id/enrollments/lock/:level_id", handler.Unlock)
	admin.DELETE("/students/:id/enrollments/:group_id/:subject_id", handler.Delete)

	studentAccess.GET("/students/:id/enrollments", handler.ListByStudent)
	teacherOrAdmin.GET("/subjects/:id/students", handler.ListStudentsBySubject)
	teacherOrAdmin.GET("/groups/:group_id/students", handler.ListStudentsByGroup)

	protected.POST("/enrollments/validate", handler.Validate)
}
