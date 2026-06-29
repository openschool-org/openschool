package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterClassRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewClassRepository(pool)
	service := services.NewClassService(repo)
	handler := handlers.NewClassHandler(service)

	admin.POST("/classes", handler.Create)
	teacherOrAdmin.GET("/classes/current", handler.ListCurrent)
	teacherOrAdmin.GET("/classes/:id", handler.GetByID)
	admin.PUT("/classes/:id", handler.Update)
	admin.DELETE("/classes/:id", handler.Delete)
	admin.PUT("/classes/:id/form-teacher", handler.AssignFormTeacher)
	admin.POST("/classes/:id/subject-teachers", handler.AssignSubjectTeacher)
	admin.GET("/classes/:id/subject-teachers", handler.ListSubjectTeachers)
	teacherOrAdmin.GET("/academic-years/:academic_year_id/classes", handler.ListByAcademicYear)

	teacherOrAdmin.POST("/classes/:id/students/:student_id/enroll", handler.EnrollStudent)
	teacherOrAdmin.DELETE("/classes/:id/students/:student_id/unenroll", handler.UnenrollStudent)
}
