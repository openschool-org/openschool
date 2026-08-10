package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type PrefectHandler struct {
	service *services.PrefectService
}

func NewPrefectHandler(service *services.PrefectService) *PrefectHandler {
	return &PrefectHandler{service: service}
}

// Assign godoc
// @Summary      Appoint (or re-appoint) a student as a prefect
// @Description  Upserts the prefect rank for a student in an academic year
// @Tags         prefects
// @Accept       json
// @Produce      json
// @Param        request body models.AssignPrefectRequest true "Appointment"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /prefects [put]
func (h *PrefectHandler) Assign(c *gin.Context) {
	var req models.AssignPrefectRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	prefect, err := h.service.Assign(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, prefect)
}

// List godoc
// @Summary      List prefects for an academic year
// @Tags         prefects
// @Produce      json
// @Param        academic_year_id query string true "Academic year UUID"
// @Success      200 {array} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /prefects [get]
func (h *PrefectHandler) List(c *gin.Context) {
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

// ListByStudent godoc
// @Summary      List a student's prefect appointments across all years
// @Tags         prefects
// @Produce      json
// @Param        id path string true "Student ID"
// @Success      200 {array} map[string]interface{}
// @Security     BearerAuth
// @Router       /students/{id}/prefect-appointments [get]
func (h *PrefectHandler) ListByStudent(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	list, err := h.service.ListByStudent(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, list)
}

// ListYears godoc
// @Summary      List academic years that have a prefect board
// @Tags         prefects
// @Produce      json
// @Success      200 {array} map[string]interface{}
// @Security     BearerAuth
// @Router       /prefects/years [get]
func (h *PrefectHandler) ListYears(c *gin.Context) {
	years, err := h.service.ListYears(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, years)
}

// Delete godoc
// @Summary      Remove a prefect appointment
// @Tags         prefects
// @Produce      json
// @Param        id path string true "Prefect UUID"
// @Success      200 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Security     BearerAuth
// @Router       /prefects/{id} [delete]
func (h *PrefectHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrPrefectNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "prefect appointment removed"})
}
