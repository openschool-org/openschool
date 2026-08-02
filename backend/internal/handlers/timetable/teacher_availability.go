package timetable

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	models "github.com/openschool-org/openschool/internal/models/timetable"
	services "github.com/openschool-org/openschool/internal/services/timetable"
)

type TeacherAvailabilityHandler struct {
	service *services.TeacherAvailabilityService
}

func NewTeacherAvailabilityHandler(service *services.TeacherAvailabilityService) *TeacherAvailabilityHandler {
	return &TeacherAvailabilityHandler{service: service}
}

func (h *TeacherAvailabilityHandler) Create(c *gin.Context) {
	teacherID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid teacher id"})
		return
	}
	var req models.CreateTeacherAvailabilityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	availability, err := h.service.Create(c.Request.Context(), teacherID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, availability)
}

func (h *TeacherAvailabilityHandler) ListByTeacherYear(c *gin.Context) {
	teacherID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid teacher id"})
		return
	}
	yearID, err := uuid.Parse(c.Query("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid academic_year_id is required"})
		return
	}
	list, err := h.service.ListByTeacherYear(c.Request.Context(), teacherID, yearID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *TeacherAvailabilityHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("availability_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "availability removed"})
}
