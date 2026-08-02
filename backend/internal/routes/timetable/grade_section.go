package timetable

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	handlers "github.com/openschool-org/openschool/internal/handlers/timetable"
	repositories "github.com/openschool-org/openschool/internal/repositories/timetable"
	services "github.com/openschool-org/openschool/internal/services/timetable"
)

func RegisterGradeSectionRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewGradeSectionRepository(pool)
	settingsRepo := repositories.NewTimetableSettingsRepository(pool)
	service := services.NewGradeSectionService(repo, settingsRepo)
	handler := handlers.NewGradeSectionHandler(service)

	admin.POST("/grade-sections", handler.Create)
	teacherOrAdmin.GET("/grade-sections", handler.ListByYear)
	teacherOrAdmin.GET("/grade-sections/:id", handler.GetByID)
	admin.PUT("/grade-sections/:id", handler.Update)
	admin.DELETE("/grade-sections/:id", handler.Delete)
	admin.PUT("/grade-sections/:id/grades", handler.AssignGrades)
	admin.DELETE("/grade-sections/:id/grades/:grade_id", handler.RemoveGrade)

	teacherOrAdmin.GET("/grade-sections/:id/periods", handler.GetPeriods)
	admin.PUT("/grade-sections/:id/periods", handler.SavePeriods)
	admin.POST("/grade-sections/:id/periods/generate", handler.RegeneratePeriods)
}
