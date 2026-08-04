package timetable

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	models "github.com/openschool-org/openschool/internal/models/timetable"
	services "github.com/openschool-org/openschool/internal/services/timetable"
)

type TimetableSettingsHandler struct {
	service *services.TimetableSettingsService
}

func NewTimetableSettingsHandler(service *services.TimetableSettingsService) *TimetableSettingsHandler {
	return &TimetableSettingsHandler{service: service}
}

func (h *TimetableSettingsHandler) Upsert(c *gin.Context) {
	var req models.UpsertTimetableSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	settings, err := h.service.Upsert(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, settings)
}

func (h *TimetableSettingsHandler) GetByYear(c *gin.Context) {
	yearID, err := uuid.Parse(c.Param("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid academic year id"})
		return
	}
	settings, err := h.service.GetByYear(c.Request.Context(), yearID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no timetable settings configured for this academic year"})
		return
	}
	c.JSON(http.StatusOK, settings)
}
