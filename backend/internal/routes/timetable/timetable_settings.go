package timetable

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	handlers "github.com/openschool-org/openschool/internal/handlers/timetable"
	repositories "github.com/openschool-org/openschool/internal/repositories/timetable"
	services "github.com/openschool-org/openschool/internal/services/timetable"
)

func RegisterTimetableSettingsRoutes(admin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewTimetableSettingsRepository(pool)
	service := services.NewTimetableSettingsService(repo)
	handler := handlers.NewTimetableSettingsHandler(service)

	admin.PUT("/timetable-settings", handler.Upsert)
	admin.GET("/timetable-settings/:academic_year_id", handler.GetByYear)
}
