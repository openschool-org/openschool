package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
	timetableservices "github.com/openschool-org/openschool/internal/services/timetable"
)

// RegisterTeacherSelfRoutes wires the signed-in teacher's self-service
// endpoints. It takes the already-constructed TimetableService (rather than
// building its own) because that service carries a notifications dependency
// assembled once in Setup — see timetableroutes.RegisterTimetableRoutes.
func RegisterTeacherSelfRoutes(teacher *gin.RouterGroup, pool *pgxpool.Pool, timetableService *timetableservices.TimetableService) {
	teacherRepo := repositories.NewTeacherRepository(pool)
	schoolRepo := repositories.NewSchoolRepository(pool)
	positionService := services.NewPositionService(repositories.NewPositionRepository(pool), repositories.NewSectionHeadRepository(pool), nil)
	societyService := services.NewSocietyService(repositories.NewSocietyRepository(pool), teacherRepo)
	dashboardService := services.NewDashboardService(repositories.NewDashboardRepository(pool))
	handler := handlers.NewTeacherSelfHandler(teacherRepo, schoolRepo, positionService, societyService, dashboardService, timetableService)

	teacher.GET("/me/teacher", handler.Profile)
	teacher.GET("/me/teacher/position", handler.Position)
	teacher.GET("/me/teacher/leadership-overview", handler.LeadershipOverview)
	teacher.GET("/me/teacher/society", handler.Society)
	teacher.GET("/me/teacher/analytics", handler.Analytics)
	teacher.GET("/me/teacher/timetables", handler.Timetables)
}
