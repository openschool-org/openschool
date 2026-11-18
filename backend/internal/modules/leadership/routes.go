package leadership

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/platform/httpx"
)

type handler struct{ service *Service }

func RegisterRoutes(admin, teacherOrAdmin *gin.RouterGroup, service *Service) {
	h := &handler{service: service}
	admin.PUT("/positions/principal", h.assignPrincipal)
	admin.PUT("/positions/vice-principal", h.assignVicePrincipal)
	teacherOrAdmin.GET("/positions", h.listPositions)
	admin.DELETE("/positions/:id", h.deletePosition)
	admin.PUT("/section-heads", h.assignSectionHead)
	teacherOrAdmin.GET("/section-heads", h.listSectionHeads)
	admin.DELETE("/section-heads/:id", h.deleteSectionHead)
}

func (h *handler) assignPrincipal(c *gin.Context) {
	var req AssignPrincipalRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	actorID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}
	position, err := h.service.AssignPrincipal(c.Request.Context(), req, actorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, position)
}

func (h *handler) assignVicePrincipal(c *gin.Context) {
	var req AssignVicePrincipalRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	actorID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}
	position, err := h.service.AssignVicePrincipal(c.Request.Context(), req, actorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, position)
}

func (h *handler) listPositions(c *gin.Context) {
	positions, err := h.service.ListPositions(c.Request.Context())
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, positions)
}

func (h *handler) deletePosition(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	actorID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}
	if err := h.service.DeletePosition(c.Request.Context(), id, actorID); err != nil {
		if errors.Is(err, ErrPositionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			apierror.RespondInternal(c, err)
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "position removed"})
}

func (h *handler) assignSectionHead(c *gin.Context) {
	var req AssignSectionHeadRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sectionHead, err := h.service.AssignSectionHead(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, sectionHead)
}

func (h *handler) listSectionHeads(c *gin.Context) {
	yearID, err := uuid.Parse(c.Query("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid academic_year_id is required"})
		return
	}
	sectionHeads, err := h.service.ListSectionHeads(c.Request.Context(), yearID)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, sectionHeads)
}

func (h *handler) deleteSectionHead(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.service.DeleteSectionHead(c.Request.Context(), id); err != nil {
		if errors.Is(err, ErrSectionHeadNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			apierror.RespondInternal(c, err)
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "section head removed"})
}
