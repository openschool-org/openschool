package timetable

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	models "github.com/openschool-org/openschool/internal/models/timetable"
	services "github.com/openschool-org/openschool/internal/services/timetable"
)

type SubjectPeriodRequirementHandler struct {
	service *services.SubjectPeriodRequirementService
}

func NewSubjectPeriodRequirementHandler(service *services.SubjectPeriodRequirementService) *SubjectPeriodRequirementHandler {
	return &SubjectPeriodRequirementHandler{service: service}
}

func (h *SubjectPeriodRequirementHandler) Upsert(c *gin.Context) {
	var req models.UpsertSubjectPeriodRequirementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	requirement, err := h.service.Upsert(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, requirement)
}

func (h *SubjectPeriodRequirementHandler) ListByGrade(c *gin.Context) {
	yearID, err := uuid.Parse(c.Query("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid academic_year_id is required"})
		return
	}
	gradeID, err := uuid.Parse(c.Query("grade_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid grade_id is required"})
		return
	}
	requirements, err := h.service.ListByGrade(c.Request.Context(), yearID, gradeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, requirements)
}

func (h *SubjectPeriodRequirementHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "subject period requirement removed"})
}
