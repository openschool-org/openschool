package notifications

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	services "github.com/openschool-org/openschool/internal/services/notifications"
)

type NotificationHandler struct {
	service *services.NotificationService
}

func NewNotificationHandler(service *services.NotificationService) *NotificationHandler {
	return &NotificationHandler{service: service}
}

func (h *NotificationHandler) callerID(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.GetString("userID"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return uuid.UUID{}, false
	}
	return id, true
}

func (h *NotificationHandler) List(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}
	notifications, err := h.service.ListByUser(c.Request.Context(), callerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, notifications)
}

func (h *NotificationHandler) UnreadCount(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}
	count, err := h.service.CountUnread(c.Request.Context(), callerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"unread_count": count})
}

func (h *NotificationHandler) MarkRead(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.service.MarkRead(c.Request.Context(), id, callerID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "marked as read"})
}
