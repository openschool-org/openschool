package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

func RegisterSchoolRoutes(r *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewSchoolRepository(pool)
	service := services.NewSchoolService(repo)
	handler := handlers.NewSchoolHandler(service)

	r.POST("/school", handler.Create)
	r.GET("/school", handler.Get)
	r.PUT("/school/:id", handler.Update)

	r.POST("/academic-years", handler.CreateAcademicYear)
	r.GET("/academic-years", handler.ListAcademicYears)
	r.GET("/academic-years/current", handler.GetCurrentAcademicYear)
	r.PUT("/academic-years/:id/set-current", handler.SetCurrentAcademicYear)
	r.DELETE("/academic-years/:id", handler.DeleteAcademicYear)
}
