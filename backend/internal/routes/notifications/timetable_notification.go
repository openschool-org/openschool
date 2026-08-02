package notifications

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	handlers "github.com/openschool-org/openschool/internal/handlers/notifications"
	repositories "github.com/openschool-org/openschool/internal/repositories/notifications"
	services "github.com/openschool-org/openschool/internal/services/notifications"
)

// RegisterTimetableNotificationRoutes wires the in-app notification feed
// for every role that can receive timetable notifications.
func RegisterTimetableNotificationRoutes(protected *gin.RouterGroup, pool *pgxpool.Pool) {
	service := services.NewNotificationService(repositories.NewTimetableNotificationRepository(pool))
	handler := handlers.NewNotificationHandler(service)

	protected.GET("/notifications/timetable", handler.List)
	protected.GET("/notifications/timetable/unread-count", handler.UnreadCount)
	protected.POST("/notifications/timetable/:id/read", handler.MarkRead)
}
