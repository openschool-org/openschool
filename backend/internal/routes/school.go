package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterSchoolRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewSchoolRepository(pool)
	service := services.NewSchoolService(repo)
	handler := handlers.NewSchoolHandler(service)

	admin.POST("/school", handler.Create)
	teacherOrAdmin.GET("/school", handler.Get)
	admin.PUT("/school/:id", handler.Update)

	admin.POST("/academic-years", handler.CreateAcademicYear)
	teacherOrAdmin.GET("/academic-years", handler.ListAcademicYears)
	teacherOrAdmin.GET("/academic-years/current", handler.GetCurrentAcademicYear)
	admin.PUT("/academic-years/:id/set-current", handler.SetCurrentAcademicYear)
	admin.DELETE("/academic-years/:id", handler.DeleteAcademicYear)
}
