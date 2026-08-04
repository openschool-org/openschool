package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type TermMarkHandler struct {
	service *services.TermMarkService
}

func NewTermMarkHandler(service *services.TermMarkService) *TermMarkHandler {
	return &TermMarkHandler{service: service}
}

// statusForMarkError maps a not-assigned-to-subject failure to 403, so
// callers can tell "you can't see this" apart from a genuine 404/500.
func statusForMarkError(err error, fallbackStatus int) int {
	if errors.Is(err, services.ErrNotAssignedToSubject) {
		return http.StatusForbidden
	}
	return fallbackStatus
}

// BulkUpsert godoc
// @Summary      Record term marks for a class
// @Description  Upserts one term-test mark per student for a given term and subject
// @Tags         marks
// @Accept       json
// @Produce      json
// @Param        id       path      string                          true  "Class UUID"
// @Param        request  body      models.BulkUpsertMarksRequest  true  "Marks"
// @Success      200      {array}   map[string]any
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /classes/{id}/marks [put]
func (h *TermMarkHandler) BulkUpsert(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.BulkUpsertMarksRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	marks, err := h.service.BulkUpsertMarks(c.Request.Context(), classID, actor, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, marks)
}

// ListClassMarks godoc
// @Summary      List a class's marks for a term/subject
// @Description  Every student in the class with their mark, if entered, for the given term and subject
// @Tags         marks
// @Produce      json
// @Param        id          path      string  true  "Class UUID"
// @Param        term_id     query     string  true  "Term UUID"
// @Param        subject_id  query     string  true  "Subject UUID"
// @Success      200  {array}   map[string]any
// @Failure      400  {object}  map[string]string
// @Security     BearerAuth
// @Router       /classes/{id}/marks [get]
func (h *TermMarkHandler) ListClassMarks(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	termID, err := uuid.Parse(c.Query("term_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or missing term_id"})
		return
	}
	subjectID, err := uuid.Parse(c.Query("subject_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or missing subject_id"})
		return
	}

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	rows, err := h.service.ListClassMarks(c.Request.Context(), actor, classID, termID, subjectID)
	if err != nil {
		c.JSON(statusForMarkError(err, http.StatusInternalServerError), gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, rows)
}

// ListStudentMarks godoc
// @Summary      List a student's marks for a term
// @Description  Every subject mark recorded for the student in the given term
// @Tags         marks
// @Produce      json
// @Param        id       path      string  true  "Student UUID"
// @Param        term_id  query     string  true  "Term UUID"
// @Success      200  {array}   map[string]any
// @Failure      400  {object}  map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/marks [get]
func (h *TermMarkHandler) ListStudentMarks(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	termID, err := uuid.Parse(c.Query("term_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or missing term_id"})
		return
	}

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	rows, err := h.service.ListStudentMarksForTeacher(c.Request.Context(), actor, studentID, termID)
	if err != nil {
		c.JSON(statusForMarkError(err, http.StatusInternalServerError), gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, rows)
}

// DeleteMark godoc
// @Summary      Delete a recorded mark
// @Tags         marks
// @Produce      json
// @Param        id   path      string  true  "Term mark UUID"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Security     BearerAuth
// @Router       /marks/{id} [delete]
func (h *TermMarkHandler) DeleteMark(c *gin.Context) {
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

	if err := h.service.DeleteMark(c.Request.Context(), actor, id); err != nil {
		c.JSON(statusForMarkError(err, http.StatusInternalServerError), gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "mark deleted"})
}
