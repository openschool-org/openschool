package timetable

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/middleware"
	models "github.com/openschool-org/openschool/internal/models/timetable"
	services "github.com/openschool-org/openschool/internal/services/timetable"
)

func parseInt16Param(c *gin.Context, name string) (int16, error) {
	n, err := strconv.ParseInt(c.Param(name), 10, 16)
	if err != nil {
		return 0, err
	}
	return int16(n), nil
}

type TimetableHandler struct {
	service *services.TimetableService
}

func NewTimetableHandler(service *services.TimetableService) *TimetableHandler {
	return &TimetableHandler{service: service}
}

func (h *TimetableHandler) callerID(c *gin.Context) (uuid.UUID, bool) {
	id, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return uuid.UUID{}, false
	}
	return id, true
}

func (h *TimetableHandler) writeServiceError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrTimetableNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrInvalidTransition):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrNotAuthorizedReviewer):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrValidationFailed):
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}
}

func (h *TimetableHandler) Create(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}
	var req models.CreateTimetableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tt, err := h.service.Create(c.Request.Context(), req, callerID)
	if err != nil {
		h.writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, tt)
}

func (h *TimetableHandler) CopyFrom(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}
	var body struct {
		models.CreateTimetableRequest
		SourceTimetableID uuid.UUID `json:"source_timetable_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tt, err := h.service.CopyFrom(c.Request.Context(), body.CreateTimetableRequest, body.SourceTimetableID, callerID)
	if err != nil {
		h.writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, tt)
}

func (h *TimetableHandler) Revise(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	tt, err := h.service.ReviseFromPublished(c.Request.Context(), id, callerID)
	if err != nil {
		h.writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, tt)
}

func (h *TimetableHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	tt, err := h.service.Get(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "timetable not found"})
		return
	}
	c.JSON(http.StatusOK, tt)
}

func (h *TimetableHandler) ListByClass(c *gin.Context) {
	classID, err := uuid.Parse(c.Query("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid class_id is required"})
		return
	}
	yearID, err := uuid.Parse(c.Query("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid academic_year_id is required"})
		return
	}
	list, err := h.service.ListByClass(c.Request.Context(), classID, yearID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *TimetableHandler) ListByAcademicYear(c *gin.Context) {
	yearID, err := uuid.Parse(c.Query("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid academic_year_id is required"})
		return
	}
	list, err := h.service.ListByAcademicYear(c.Request.Context(), yearID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *TimetableHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.service.DeleteDraft(c.Request.Context(), id); err != nil {
		h.writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "timetable deleted"})
}

func (h *TimetableHandler) Archive(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	tt, err := h.service.Archive(c.Request.Context(), id)
	if err != nil {
		h.writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, tt)
}

// Entries

func (h *TimetableHandler) GetEntries(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	entries, err := h.service.GetEntries(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, entries)
}

func (h *TimetableHandler) SaveEntries(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var req models.SaveTimetableEntriesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.service.SaveEntries(c.Request.Context(), id, req); err != nil {
		h.writeServiceError(c, err)
		return
	}
	entries, err := h.service.GetEntries(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, entries)
}

func (h *TimetableHandler) DeleteEntry(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	day, err := parseInt16Param(c, "day")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid day"})
		return
	}
	period, err := parseInt16Param(c, "period")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid period"})
		return
	}
	if err := h.service.DeleteEntry(c.Request.Context(), id, day, period); err != nil {
		h.writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "entry cleared"})
}

// Validation

func (h *TimetableHandler) Validate(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	result, err := h.service.Validate(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

// Workflow

func (h *TimetableHandler) Submit(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	tt, err := h.service.Submit(c.Request.Context(), id, callerID)
	if err != nil {
		h.writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, tt)
}

func (h *TimetableHandler) Approve(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var req models.ApproveTimetableRequest
	if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tt, err := h.service.Approve(c.Request.Context(), id, callerID, req.Comment)
	if err != nil {
		h.writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, tt)
}

func (h *TimetableHandler) Reject(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var req models.RejectTimetableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tt, err := h.service.Reject(c.Request.Context(), id, callerID, req.Comment)
	if err != nil {
		h.writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, tt)
}

func (h *TimetableHandler) Publish(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	tt, err := h.service.Publish(c.Request.Context(), id, callerID)
	if err != nil {
		h.writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, tt)
}

func (h *TimetableHandler) ReviewQueue(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}
	yearID, err := uuid.Parse(c.Query("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid academic_year_id is required"})
		return
	}
	list, err := h.service.ListReviewQueueForTeacher(c.Request.Context(), callerID, yearID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *TimetableHandler) StatusHistory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	history, err := h.service.ListStatusHistory(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, history)
}

// Portal views

func (h *TimetableHandler) MyTeacherSchedule(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}
	yearID, err := uuid.Parse(c.Query("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid academic_year_id is required"})
		return
	}
	schedule, err := h.service.GetTeacherSchedule(c.Request.Context(), callerID, yearID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no teacher profile linked to this account"})
		return
	}
	c.JSON(http.StatusOK, schedule)
}

func (h *TimetableHandler) MyClassTimetable(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}
	tt, entries, err := h.service.GetPublishedForStudentUser(c.Request.Context(), callerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no published timetable found for your class"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"timetable": tt, "entries": entries})
}

func (h *TimetableHandler) PublishedForClass(c *gin.Context) {
	classID, err := uuid.Parse(c.Query("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid class_id is required"})
		return
	}
	yearID, err := uuid.Parse(c.Query("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid academic_year_id is required"})
		return
	}
	tt, entries, err := h.service.GetPublishedForClass(c.Request.Context(), classID, yearID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no published timetable for this class"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"timetable": tt, "entries": entries})
}

// Generate godoc
// @Summary      Auto-generate draft timetables for a grade section
// @Description  Best-effort fills every class in the grade section at once (teachers/labs are shared across them); unsatisfiable periods are reported as gaps, not errors
// @Tags         timetables
// @Accept       json
// @Produce      json
// @Param        request body models.GenerateTimetablesRequest true "Grade section + academic year"
// @Success      200 {object} models.GenerationResult
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /timetables/generate [post]
func (h *TimetableHandler) Generate(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}
	var req models.GenerateTimetablesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.GenerateForGradeSection(c.Request.Context(), req.GradeSectionID, req.AcademicYearID, callerID)
	if err != nil {
		h.writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
