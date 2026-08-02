package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
	timetableservices "github.com/openschool-org/openschool/internal/services/timetable"
)

func RegisterParentRoutes(parent *gin.RouterGroup, timetables *timetableservices.TimetableService, pool *pgxpool.Pool) {
	guardianService := services.NewGuardianService(repositories.NewGuardianRepository(pool), repositories.NewUserRepository(pool), newIdentityProvider())
	attendanceService := services.NewAttendanceService(repositories.NewAttendanceRepository(pool), repositories.NewUserRepository(pool), repositories.NewTeacherRepository(pool), repositories.NewClassRepository(pool))
	marksService := services.NewTermMarkService(repositories.NewTermMarkRepository(pool), repositories.NewTeacherRepository(pool), repositories.NewClassRepository(pool))

	handler := handlers.NewParentHandler(guardianService, attendanceService, marksService, timetables)

	parent.GET("/me/children", handler.ListChildren)
	parent.GET("/me/children/:id/attendance", handler.ChildAttendance)
	parent.GET("/me/children/:id/marks", handler.ChildMarks)
	parent.GET("/me/children/:id/timetable", handler.ChildTimetable)
}
