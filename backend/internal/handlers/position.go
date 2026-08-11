package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type PositionHandler struct {
	service *services.PositionService
}

func NewPositionHandler(service *services.PositionService) *PositionHandler {
	return &PositionHandler{service: service}
}

// AssignPrincipal godoc
// @Summary      Assign the school's Principal
// @Description  Permanent appointment (not scoped to an academic year) — replaces any existing Principal
// @Tags         positions
// @Accept       json
// @Produce      json
// @Param        request body models.AssignPrincipalRequest true "Assignment"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /positions/principal [put]
func (h *PositionHandler) AssignPrincipal(c *gin.Context) {
	var req models.AssignPrincipalRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	position, err := h.service.AssignPrincipal(c.Request.Context(), req, actor.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, position)
}

// AssignVicePrincipal godoc
// @Summary      Assign a Vice Principal
// @Description  Permanent appointment (not scoped to an academic year); upserts the Vice Principal's notification grant (whole-school or grade-scoped)
// @Tags         positions
// @Accept       json
// @Produce      json
// @Param        request body models.AssignVicePrincipalRequest true "Assignment"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /positions/vice-principal [put]
func (h *PositionHandler) AssignVicePrincipal(c *gin.Context) {
	var req models.AssignVicePrincipalRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	position, err := h.service.AssignVicePrincipal(c.Request.Context(), req, actor.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, position)
}

// List godoc
// @Summary      List leadership positions (Principal, Vice Principals)
// @Tags         positions
// @Produce      json
// @Success      200 {array} map[string]string
// @Failure      500 {object} map[string]string
// @Security     BearerAuth
// @Router       /positions [get]
func (h *PositionHandler) List(c *gin.Context) {
	list, err := h.service.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, list)
}

// Delete godoc
// @Summary      Remove a position assignment
// @Tags         positions
// @Produce      json
// @Param        id path string true "Position UUID"
// @Success      200 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Security     BearerAuth
// @Router       /positions/{id} [delete]
func (h *PositionHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.Delete(c.Request.Context(), id, actor.ID); err != nil {
		if errors.Is(err, services.ErrPositionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "position removed"})
}
