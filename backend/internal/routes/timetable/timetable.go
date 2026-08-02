package timetable

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	handlers "github.com/openschool-org/openschool/internal/handlers/timetable"
	rootrepositories "github.com/openschool-org/openschool/internal/repositories"
	notificationsrepositories "github.com/openschool-org/openschool/internal/repositories/notifications"
	repositories "github.com/openschool-org/openschool/internal/repositories/timetable"
	notificationsservices "github.com/openschool-org/openschool/internal/services/notifications"
	services "github.com/openschool-org/openschool/internal/services/timetable"
)

// RegisterTimetableRoutes wires up the timetable module and returns the
// TimetableService so RegisterParentRoutes can compose it into the
// guardian's child-timetable endpoint.
func RegisterTimetableRoutes(admin *gin.RouterGroup, teacherOrAdmin *gin.RouterGroup, teacher *gin.RouterGroup, student *gin.RouterGroup, pool *pgxpool.Pool) *services.TimetableService {
	notifications := notificationsservices.NewNotificationService(notificationsrepositories.NewTimetableNotificationRepository(pool))
	service := services.NewTimetableService(
		repositories.NewTimetableRepository(pool),
		rootrepositories.NewClassRepository(pool),
		repositories.NewGradeSectionRepository(pool),
		rootrepositories.NewSectionHeadRepository(pool),
		repositories.NewSubjectPeriodRequirementRepository(pool),
		repositories.NewTeacherAvailabilityRepository(pool),
		rootrepositories.NewTeacherRepository(pool),
		rootrepositories.NewStudentRepository(pool),
		rootrepositories.NewGuardianRepository(pool),
		notifications,
	)
	handler := handlers.NewTimetableHandler(service)

	admin.POST("/timetables", handler.Create)
	admin.POST("/timetables/copy", handler.CopyFrom)
	admin.POST("/timetables/:id/revise", handler.Revise)
	teacherOrAdmin.GET("/timetables/:id", handler.GetByID)
	teacherOrAdmin.GET("/timetables", handler.ListByClass)
	admin.GET("/timetables/by-year", handler.ListByAcademicYear)
	admin.DELETE("/timetables/:id", handler.Delete)
	admin.POST("/timetables/:id/archive", handler.Archive)

	teacherOrAdmin.GET("/timetables/:id/entries", handler.GetEntries)
	admin.PUT("/timetables/:id/entries", handler.SaveEntries)
	admin.DELETE("/timetables/:id/entries/:day/:period", handler.DeleteEntry)

	teacherOrAdmin.GET("/timetables/:id/validate", handler.Validate)
	teacherOrAdmin.GET("/timetables/:id/status-history", handler.StatusHistory)

	admin.POST("/timetables/:id/submit", handler.Submit)
	admin.POST("/timetables/:id/publish", handler.Publish)
	teacher.POST("/timetables/:id/approve", handler.Approve)
	teacher.POST("/timetables/:id/reject", handler.Reject)
	teacher.GET("/t/timetable/reviews", handler.ReviewQueue)

	teacher.GET("/t/timetable", handler.MyTeacherSchedule)
	student.GET("/timetable/my-class", handler.MyClassTimetable)
	teacherOrAdmin.GET("/timetables/published", handler.PublishedForClass)

	return service
}
