package notifications

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	handlers "github.com/openschool-org/openschool/internal/handlers/notifications"
	rootrepositories "github.com/openschool-org/openschool/internal/repositories"
	repositories "github.com/openschool-org/openschool/internal/repositories/notifications"
	timetablerepositories "github.com/openschool-org/openschool/internal/repositories/timetable"
	services "github.com/openschool-org/openschool/internal/services/notifications"
)

// RegisterNotificationRoutes wires the in-app notification composer
// (admin + teacher, scope enforced server-side) and the Notification
// Center inbox (every authenticated role).
func RegisterNotificationRoutes(teacherOrAdmin *gin.RouterGroup, protected *gin.RouterGroup, pool *pgxpool.Pool) {
	service := services.NewNotificationService(
		repositories.NewNotificationRepository(pool),
		rootrepositories.NewClassRepository(pool),
		timetablerepositories.NewGradeSectionRepository(pool),
		rootrepositories.NewSectionHeadRepository(pool),
		rootrepositories.NewTeacherRepository(pool),
		rootrepositories.NewStudentRepository(pool),
		rootrepositories.NewGuardianRepository(pool),
		rootrepositories.NewSchoolRepository(pool),
	)
	handler := handlers.NewNotificationHandler(service)

	teacherOrAdmin.POST("/notifications", handler.Create)
	teacherOrAdmin.PUT("/notifications/:id", handler.Update)
	teacherOrAdmin.POST("/notifications/:id/send", handler.Send)
	teacherOrAdmin.DELETE("/notifications/:id", handler.Delete)
	teacherOrAdmin.GET("/notifications/sent", handler.ListSent)
	teacherOrAdmin.GET("/notifications/drafts", handler.ListDrafts)
	teacherOrAdmin.GET("/notifications/:id/stats", handler.Stats)

	protected.GET("/me/notifications", handler.ListMine)
	protected.GET("/me/notifications/archived", handler.ListMyArchived)
	protected.GET("/me/notifications/unread-count", handler.UnreadCount)
	protected.POST("/me/notifications/:id/read", handler.MarkRead)
	protected.POST("/me/notifications/:id/archive", handler.Archive)
	protected.POST("/me/notifications/:id/unarchive", handler.Unarchive)
}
