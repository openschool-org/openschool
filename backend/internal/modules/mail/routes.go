package mail

import (
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/emails"
	"github.com/openschool-org/openschool/internal/middleware"
)

type userEmails interface {
	userEmail(ctx context.Context, id uuid.UUID) (string, error)
}

type handler struct {
	sender *emails.Sender
	users  userEmails
}

// RegisterRoutes adds the admin-only status, preview and test-send endpoints.
func RegisterRoutes(admin *gin.RouterGroup, sender *emails.Sender, repo *Repository) {
	h := handler{sender: sender, users: repo}
	admin.GET("/email/status", h.status)
	admin.GET("/email/templates", h.templates)
	admin.GET("/email/templates/:key/preview", h.preview)
	// Test sends use real provider quota, so they are throttled per IP.
	admin.POST("/email/test", middleware.RateLimit(0.1, 3), h.sendTest)
}

func (h handler) status(c *gin.Context) {
	c.JSON(http.StatusOK, h.sender.Status())
}

func (h handler) templates(c *gin.Context) {
	c.JSON(http.StatusOK, h.sender.Templates())
}

func (h handler) preview(c *gin.Context) {
	preview, err := h.sender.Preview(c.Request.Context(), c.Param("key"))
	if errors.Is(err, emails.ErrUnknownTemplate) {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, preview)
}

type testRequest struct {
	Template string `json:"template" binding:"required,max=64"`
}

// sendTest mails a sample to the signed-in admin's own address, never to an address from the request.
func (h handler) sendTest(c *gin.Context) {
	actor, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}
	var req testRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "choose a template"})
		return
	}
	to, err := h.users.userEmail(c.Request.Context(), actor)
	if err != nil || to == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "your account has no email address to send to"})
		return
	}
	err = h.sender.SendTest(c.Request.Context(), req.Template, to)
	if errors.Is(err, emails.ErrUnknownTemplate) {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	sentTo := to
	if status := h.sender.Status(); status.RedirectTo != "" {
		sentTo = status.RedirectTo
	}
	c.JSON(http.StatusOK, gin.H{"sent_to": sentTo})
}
