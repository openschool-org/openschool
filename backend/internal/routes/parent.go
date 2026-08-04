package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openschool-org/openschool/internal/handlers"
	"github.com/openschool-org/openschool/internal/repositories"
	notificationsrepositories "github.com/openschool-org/openschool/internal/repositories/notifications"
	timetablerepositories "github.com/openschool-org/openschool/internal/repositories/timetable"
	"github.com/openschool-org/openschool/internal/services"
	notificationsservices "github.com/openschool-org/openschool/internal/services/notifications"
	timetableservices "github.com/openschool-org/openschool/internal/services/timetable"
)

func RegisterParentRoutes(parent *gin.RouterGroup, timetables *timetableservices.TimetableService, pool *pgxpool.Pool) {
	guardianRepo := repositories.NewGuardianRepository(pool)
	notifications := notificationsservices.NewNotificationService(
		notificationsrepositories.NewNotificationRepository(pool),
		repositories.NewClassRepository(pool),
		timetablerepositories.NewGradeSectionRepository(pool),
		repositories.NewSectionHeadRepository(pool),
		repositories.NewTeacherRepository(pool),
		repositories.NewStudentRepository(pool),
		guardianRepo,
		repositories.NewSchoolRepository(pool),
		repositories.NewPositionRepository(pool),
	)
	guardianService := services.NewGuardianService(guardianRepo, repositories.NewUserRepository(pool), newIdentityProvider(), notifications)
	auditSvc := services.NewAuditService(repositories.NewAuditRepository(pool))
	attendanceService := services.NewAttendanceService(repositories.NewAttendanceRepository(pool), repositories.NewUserRepository(pool), repositories.NewTeacherRepository(pool), repositories.NewClassRepository(pool), repositories.NewStudentRepository(pool), guardianRepo, notifications, auditSvc)
	marksService := services.NewTermMarkService(repositories.NewTermMarkRepository(pool), repositories.NewTeacherRepository(pool), repositories.NewClassRepository(pool))

	handler := handlers.NewParentHandler(guardianService, attendanceService, marksService, timetables)

	parent.GET("/me/children", handler.ListChildren)
	parent.GET("/me/children/:id/attendance", handler.ChildAttendance)
	parent.GET("/me/children/:id/marks", handler.ChildMarks)
	parent.GET("/me/children/:id/timetable", handler.ChildTimetable)
}
