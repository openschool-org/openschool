package timetable

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	handlers "github.com/openschool-org/openschool/internal/handlers/timetable"
	repositories "github.com/openschool-org/openschool/internal/repositories/timetable"
	services "github.com/openschool-org/openschool/internal/services/timetable"
)

func RegisterSubjectPeriodRequirementRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, pool *pgxpool.Pool) {
	repo := repositories.NewSubjectPeriodRequirementRepository(pool)
	service := services.NewSubjectPeriodRequirementService(repo)
	handler := handlers.NewSubjectPeriodRequirementHandler(service)

	admin.PUT("/subject-period-requirements", handler.Upsert)
	teacherOrAdmin.GET("/subject-period-requirements", handler.ListByGrade)
	admin.DELETE("/subject-period-requirements/:id", handler.Delete)
}
