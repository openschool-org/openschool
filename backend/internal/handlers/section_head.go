package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type SectionHeadHandler struct {
	service *services.SectionHeadService
}

func NewSectionHeadHandler(service *services.SectionHeadService) *SectionHeadHandler {
	return &SectionHeadHandler{service: service}
}

// Assign godoc
// @Summary      Assign a teacher-in-charge (section head)
// @Description  Upserts the TIC for a grade, or for one A/L stream within a grade when stream_id is set
// @Tags         section-heads
// @Accept       json
// @Produce      json
// @Param        request body models.AssignSectionHeadRequest true "Assignment"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /section-heads [put]
func (h *SectionHeadHandler) Assign(c *gin.Context) {
	var req models.AssignSectionHeadRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sectionHead, err := h.service.Assign(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, sectionHead)
}

// List godoc
// @Summary      List section heads for an academic year
// @Tags         section-heads
// @Produce      json
// @Param        academic_year_id query string true "Academic year UUID"
// @Success      200 {array} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /section-heads [get]
func (h *SectionHeadHandler) List(c *gin.Context) {
	yearID, err := uuid.Parse(c.Query("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid academic_year_id is required"})
		return
	}

	list, err := h.service.ListByYear(c.Request.Context(), yearID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, list)
}

// Delete godoc
// @Summary      Remove a section head assignment
// @Tags         section-heads
// @Produce      json
// @Param        id path string true "Section head UUID"
// @Success      200 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Security     BearerAuth
// @Router       /section-heads/{id} [delete]
func (h *SectionHeadHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrSectionHeadNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "section head removed"})
}
