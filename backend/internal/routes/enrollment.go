package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterEnrollmentRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, protected *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewEnrollmentRepository(pool)
	curriculumRepo := repositories.NewCurriculumRepository(pool)
	service := services.NewEnrollmentService(repo, curriculumRepo)
	handler := handlers.NewEnrollmentHandler(service)

	admin.POST("/students/:id/enrollments", handler.Submit)
	admin.DELETE("/students/:id/enrollments/:group_id/:subject_id", handler.Delete)

	teacherOrAdmin.GET("/students/:id/enrollments", handler.ListByStudent)
	teacherOrAdmin.GET("/subjects/:id/students", handler.ListStudentsBySubject)
	teacherOrAdmin.GET("/groups/:group_id/students", handler.ListStudentsByGroup)

	// dry run — safe for a student to call while assembling their picks
	protected.POST("/enrollments/validate", handler.Validate)
}
