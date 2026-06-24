package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterClassRoutes(r *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewClassRepository(pool)
	service := services.NewClassService(repo)
	handler := handlers.NewClassHandler(service)

	r.POST("/classes", handler.Create)
	r.GET("/classes/current", handler.ListCurrent)
	r.GET("/classes/:id", handler.GetByID)
	r.PUT("/classes/:id", handler.Update)
	r.DELETE("/classes/:id", handler.Delete)
	r.PUT("/classes/:id/form-teacher", handler.AssignFormTeacher)
	r.POST("/classes/:id/subject-teachers", handler.AssignSubjectTeacher)
	r.GET("/classes/:id/subject-teachers", handler.ListSubjectTeachers)
	r.GET("/academic-years/:academic_year_id/classes", handler.ListByAcademicYear)
}
