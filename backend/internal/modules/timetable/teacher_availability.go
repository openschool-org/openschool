package timetable

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/openschool-org/openschool/internal/platform/httpx"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
)

type TeacherAvailability struct {
	ID             uuid.UUID `json:"id"`
	TeacherID      uuid.UUID `json:"teacher_id"`
	AcademicYearID uuid.UUID `json:"academic_year_id"`
	DayOfWeek      int16     `json:"day_of_week"`
	PeriodNumber   int16     `json:"period_number"`
	CreatedAt      time.Time `json:"created_at"`
}

type teacherAvailabilityCommand struct {
	AcademicYearID uuid.UUID `json:"academic_year_id" binding:"required"`
	DayOfWeek      int16     `json:"day_of_week" binding:"required"`
	PeriodNumber   int16     `json:"period_number" binding:"required"`
}

type teacherAvailabilityStore interface {
	createAvailability(context.Context, uuid.UUID, teacherAvailabilityCommand) (TeacherAvailability, error)
	listAvailability(context.Context, uuid.UUID, uuid.UUID) ([]TeacherAvailability, error)
	deleteAvailability(context.Context, uuid.UUID) error
}

type teacherAvailabilityService struct{ availability teacherAvailabilityStore }

func (s *teacherAvailabilityService) create(ctx context.Context, teacherID uuid.UUID, command teacherAvailabilityCommand) (TeacherAvailability, error) {
	if command.DayOfWeek < 1 || command.DayOfWeek > 5 {
		return TeacherAvailability{}, fmt.Errorf("day_of_week must be between 1 (Monday) and 5 (Friday)")
	}
	return s.availability.createAvailability(ctx, teacherID, command)
}

type teacherAvailabilityHandler struct{ service *teacherAvailabilityService }

func newTeacherAvailabilityHandler(store teacherAvailabilityStore) *teacherAvailabilityHandler {
	return &teacherAvailabilityHandler{service: &teacherAvailabilityService{availability: store}}
}
func (h *teacherAvailabilityHandler) create(c *gin.Context) {
	teacherID, ok := httpx.ParamUUID(c, "id", "invalid teacher id")
	if !ok {
		return
	}
	var command teacherAvailabilityCommand
	if err := c.ShouldBindJSON(&command); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	availability, err := h.service.create(c.Request.Context(), teacherID, command)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, availability)
}
func (h *teacherAvailabilityHandler) listByTeacherYear(c *gin.Context) {
	teacherID, ok := httpx.ParamUUID(c, "id", "invalid teacher id")
	if !ok {
		return
	}
	yearID, ok := httpx.QueryUUID(c, "academic_year_id", "a valid academic_year_id is required")
	if !ok {
		return
	}
	availability, err := h.service.availability.listAvailability(c.Request.Context(), teacherID, yearID)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, availability)
}
func (h *teacherAvailabilityHandler) delete(c *gin.Context) {
	id, ok := httpx.ParamUUID(c, "availability_id", "invalid id")
	if !ok {
		return
	}
	if err := h.service.availability.deleteAvailability(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "availability removed"})
}
