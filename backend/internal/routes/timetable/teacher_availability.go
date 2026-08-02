package timetable

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	handlers "github.com/openschool-org/openschool/internal/handlers/timetable"
	repositories "github.com/openschool-org/openschool/internal/repositories/timetable"
	services "github.com/openschool-org/openschool/internal/services/timetable"
)

func RegisterTeacherAvailabilityRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewTeacherAvailabilityRepository(pool)
	service := services.NewTeacherAvailabilityService(repo)
	handler := handlers.NewTeacherAvailabilityHandler(service)

	admin.POST("/teachers/:id/availability", handler.Create)
	teacherOrAdmin.GET("/teachers/:id/availability", handler.ListByTeacherYear)
	admin.DELETE("/teachers/:id/availability/:availability_id", handler.Delete)
}
