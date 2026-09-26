package automation

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/platform/httpx"
)

// JobsHandler exposes the admin Automation panel's endpoints for the background agent scheduler.
type JobsHandler struct {
	service *Service
}

// NewJobsHandler constructs a JobsHandler with its scheduler and settings dependencies.
func NewJobsHandler(service *Service) *JobsHandler {
	return &JobsHandler{service: service}
}

// List lists every registered background job and its current state.
func (h *JobsHandler) List(c *gin.Context) {
	ctx := c.Request.Context()
	status, err := h.service.List(ctx)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, status)
}

// SetEnabled enables or disables a background agent.
func (h *JobsHandler) SetEnabled(c *gin.Context) {
	name := c.Param("name")
	var req SetJobEnabledRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.SetEnabled(c.Request.Context(), name, req.Enabled); err != nil {
		if errors.Is(err, ErrUnknownJob) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, ErrSystemHealthCannotStop) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

// RunNow runs a background agent immediately, outside its schedule, honoring its enabled/disabled setting.
func (h *JobsHandler) RunNow(c *gin.Context) {
	name := c.Param("name")
	result, err := h.service.RunNow(c.Request.Context(), name)
	if err != nil {
		if errors.Is(err, ErrUnknownJob) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "summary": result.Summary, "findings": result.Findings})
		return
	}
	c.JSON(http.StatusOK, gin.H{"summary": result.Summary, "findings": result.Findings})
}

// Findings returns the agent notices that belong on the given page (?page=/attendance).
func (h *JobsHandler) Findings(c *gin.Context) {
	userID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}
	out, err := h.service.Findings(c.Request.Context(), userID, c.Query("page"))
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}
