package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type StudentSubjectSelectionHandler struct {
	service *services.StudentSubjectSelectionService
}

func NewStudentSubjectSelectionHandler(service *services.StudentSubjectSelectionService) *StudentSubjectSelectionHandler {
	return &StudentSubjectSelectionHandler{service: service}
}

// UpsertSelection godoc
// @Summary      Upsert student subject selection
// @Description  Set or update a student's subject choice for a given bucket (upsert)
// @Tags         student-selections
// @Accept       json
// @Produce      json
// @Param        id      path      string                                       true  "Student UUID"
// @Param        request body      models.UpsertStudentSubjectSelectionRequest  true  "Selection"
// @Success      200     {object}  map[string]string
// @Failure      400     {object}  map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/selections [post]
func (h *StudentSubjectSelectionHandler) UpsertSelection(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	var req models.UpsertStudentSubjectSelectionRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sel, err := h.service.Upsert(c.Request.Context(), studentID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"student_id": sel.StudentID.String(),
		"bucket_id":  sel.BucketID.String(),
		"subject_id": sel.SubjectID.String(),
	})
}

// ListSelections godoc
// @Summary      List student subject selections
// @Description  Retrieve all subject selections for a student
// @Tags         student-selections
// @Produce      json
// @Param        id  path      string  true  "Student UUID"
// @Success      200 {array}   models.StudentSubjectSelectionResponse
// @Failure      400 {object}  map[string]string
// @Failure      500 {object}  map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/selections [get]
func (h *StudentSubjectSelectionHandler) ListSelections(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	selections, err := h.service.List(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, selections)
}

// DeleteSelection godoc
// @Summary      Delete student subject selection
// @Description  Remove a student's subject selection for a specific bucket
// @Tags         student-selections
// @Produce      json
// @Param        id        path      string  true  "Student UUID"
// @Param        bucket_id path      string  true  "Bucket UUID"
// @Success      200       {object}  map[string]string
// @Failure      400       {object}  map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/selections/{bucket_id} [delete]
func (h *StudentSubjectSelectionHandler) DeleteSelection(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	bucketID, err := uuid.Parse(c.Param("bucket_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid bucket id"})
		return
	}

	if err := h.service.Delete(c.Request.Context(), studentID, bucketID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "selection removed"})
}
