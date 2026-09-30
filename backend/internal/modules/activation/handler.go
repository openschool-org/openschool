package activation

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/modules/auth"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

// startMessage is returned for every accepted start request, matched or not.
const startMessage = "If the code and details match, we have emailed you a link to finish activating your account."

// respond maps known errors to client messages and hides everything else.
func respond(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrMailUnavailable):
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
	case errors.Is(err, ErrClosed), errors.Is(err, ErrRoleDisabled):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	case errors.Is(err, ErrLinkInvalid):
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
	case errors.Is(err, ErrAlreadyActivated), errors.Is(err, ErrEmailTaken), errors.Is(err, ErrReprintDisabled):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, ErrPasswordMatchesID), errors.Is(err, ErrInvalidSettings), errors.Is(err, ErrBatchTooLarge),
		errors.Is(err, auth.ErrPasswordTooShort), errors.Is(err, auth.ErrWeakPassword):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	default:
		apierror.RespondInternal(c, err)
	}
}

func (h *Handler) Status(c *gin.Context) {
	status, err := h.service.Status(c.Request.Context())
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, status)
}

func (h *Handler) Start(c *gin.Context) {
	var req StartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "enter the code, your identifier and a valid email"})
		return
	}
	if err := h.service.Start(c.Request.Context(), req); err != nil {
		respond(c, err)
		return
	}
	c.JSON(http.StatusAccepted, gin.H{"message": startMessage})
}

func (h *Handler) Complete(c *gin.Context) {
	var req CompleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 10 characters"})
		return
	}
	if err := h.service.Complete(c.Request.Context(), req); err != nil {
		respond(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "account activated"})
}

func (h *Handler) GetSettings(c *gin.Context) {
	settings, err := h.service.Settings(c.Request.Context())
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, settings)
}

func (h *Handler) UpdateSettings(c *gin.Context) {
	actor, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}
	var req Settings
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": ErrInvalidSettings.Error()})
		return
	}
	saved, err := h.service.UpdateSettings(c.Request.Context(), req, actor)
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(http.StatusOK, saved)
}

func (h *Handler) Generate(c *gin.Context) {
	actor, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}
	var req GenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "choose students or guardians"})
		return
	}
	resp, err := h.service.Generate(c.Request.Context(), req, actor)
	if err != nil {
		respond(c, err)
		return
	}
	// The plain codes appear only in this response, so nothing may cache it.
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusCreated, resp)
}

func (h *Handler) Batches(c *gin.Context) {
	batches, err := h.service.Batches(c.Request.Context())
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, batches)
}

func (h *Handler) BatchCodes(c *gin.Context) {
	actor, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}
	batchID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid batch id"})
		return
	}
	resp, err := h.service.BatchCodes(c.Request.Context(), batchID, actor)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "batch not found"})
		return
	}
	if err != nil {
		respond(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) RevokeBatch(c *gin.Context) {
	actor, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}
	batchID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid batch id"})
		return
	}
	n, err := h.service.RevokeBatch(c.Request.Context(), batchID, actor)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"revoked": n})
}
