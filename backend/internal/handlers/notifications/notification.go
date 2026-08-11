package notifications

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	models "github.com/openschool-org/openschool/internal/models/notifications"
	services "github.com/openschool-org/openschool/internal/services/notifications"
)

type NotificationHandler struct {
	service *services.NotificationService
}

func NewNotificationHandler(service *services.NotificationService) *NotificationHandler {
	return &NotificationHandler{service: service}
}

func (h *NotificationHandler) caller(c *gin.Context) (uuid.UUID, string, bool) {
	id, err := uuid.Parse(c.GetString("userID"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return uuid.UUID{}, "", false
	}
	roles, _ := c.Get("roles")
	role := ""
	if list, ok := roles.([]string); ok {
		for _, r := range list {
			if r == "admin" {
				role = "admin"
				break
			}
			if r == "teacher" {
				role = "teacher"
			}
		}
	}
	return id, role, true
}

func (h *NotificationHandler) writeServiceError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrNotificationNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrForbiddenRecipients):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrNotADraft):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}
}

// Composer

func (h *NotificationHandler) Create(c *gin.Context) {
	callerID, role, ok := h.caller(c)
	if !ok {
		return
	}
	var req models.CreateNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	notification, err := h.service.Create(c.Request.Context(), req, callerID, role)
	if err != nil {
		h.writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, notification)
}

func (h *NotificationHandler) Update(c *gin.Context) {
	callerID, role, ok := h.caller(c)
	if !ok {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var req models.UpdateNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	notification, err := h.service.UpdateDraft(c.Request.Context(), id, req, callerID, role)
	if err != nil {
		h.writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, notification)
}

func (h *NotificationHandler) Send(c *gin.Context) {
	callerID, role, ok := h.caller(c)
	if !ok {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	notification, err := h.service.SendDraft(c.Request.Context(), id, callerID, role)
	if err != nil {
		h.writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, notification)
}

func (h *NotificationHandler) Delete(c *gin.Context) {
	callerID, role, ok := h.caller(c)
	if !ok {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.service.DeleteDraft(c.Request.Context(), id, callerID, role); err != nil {
		h.writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "draft deleted"})
}

func (h *NotificationHandler) ListSent(c *gin.Context) {
	callerID, role, ok := h.caller(c)
	if !ok {
		return
	}
	list, err := h.service.ListSent(c.Request.Context(), callerID, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *NotificationHandler) ListDrafts(c *gin.Context) {
	callerID, _, ok := h.caller(c)
	if !ok {
		return
	}
	list, err := h.service.ListMyDrafts(c.Request.Context(), callerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *NotificationHandler) Stats(c *gin.Context) {
	callerID, role, ok := h.caller(c)
	if !ok {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	stats, err := h.service.GetStats(c.Request.Context(), id, callerID, role)
	if err != nil {
		h.writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

// Notification Center

func (h *NotificationHandler) ListMine(c *gin.Context) {
	callerID, _, ok := h.caller(c)
	if !ok {
		return
	}
	list, err := h.service.ListMine(c.Request.Context(), callerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *NotificationHandler) ListMyArchived(c *gin.Context) {
	callerID, _, ok := h.caller(c)
	if !ok {
		return
	}
	list, err := h.service.ListMyArchived(c.Request.Context(), callerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *NotificationHandler) UnreadCount(c *gin.Context) {
	callerID, _, ok := h.caller(c)
	if !ok {
		return
	}
	count, err := h.service.CountMyUnread(c.Request.Context(), callerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"unread_count": count})
}

func (h *NotificationHandler) MarkRead(c *gin.Context) {
	callerID, _, ok := h.caller(c)
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

func (h *NotificationHandler) Archive(c *gin.Context) {
	h.setArchived(c, true)
}

func (h *NotificationHandler) Unarchive(c *gin.Context) {
	h.setArchived(c, false)
}

func (h *NotificationHandler) setArchived(c *gin.Context, archived bool) {
	callerID, _, ok := h.caller(c)
	if !ok {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.service.SetArchived(c.Request.Context(), id, callerID, archived); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}
