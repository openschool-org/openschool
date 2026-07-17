package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type EnrollmentHandler struct {
	service *services.EnrollmentService
}

func NewEnrollmentHandler(service *services.EnrollmentService) *EnrollmentHandler {
	return &EnrollmentHandler{service: service}
}

// requireAcademicYear reads the mandatory ?academic_year_id= query parameter.
func requireAcademicYear(c *gin.Context) (uuid.UUID, bool) {
	raw := c.Query("academic_year_id")
	if raw == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "academic_year_id is required"})
		return uuid.UUID{}, false
	}

	id, err := uuid.Parse(raw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid academic_year_id"})
		return uuid.UUID{}, false
	}

	return id, true
}

// Validate godoc
// @Summary      Validate enrollment picks
// @Description  Dry run: checks picks against every group of the level without saving
// @Tags         enrollments
// @Accept       json
// @Produce      json
// @Param        request  body      models.SubmitEnrollmentRequest  true  "Proposed picks"
// @Success      200      {object}  models.EnrollmentValidationResponse
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /enrollments/validate [post]
func (h *EnrollmentHandler) Validate(c *gin.Context) {
	var req models.SubmitEnrollmentRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	levelID, err := uuid.Parse(req.LevelID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid level_id"})
		return
	}

	validationErrs, err := h.service.Validate(c.Request.Context(), levelID, req.Picks)
	if err != nil {
		if errors.Is(err, services.ErrLevelHasNoGroups) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.EnrollmentValidationResponse{
		Valid:  len(validationErrs) == 0,
		Errors: validationErrs,
	})
}

// Submit godoc
// @Summary      Submit enrollment picks
// @Description  Validates then replaces the student's picks for that level and academic year
// @Tags         enrollments
// @Accept       json
// @Produce      json
// @Param        id       path      string                          true  "Student UUID"
// @Param        request  body      models.SubmitEnrollmentRequest  true  "Picks"
// @Success      200      {object}  models.EnrollmentValidationResponse
// @Failure      400      {object}  map[string]string
// @Failure      422      {object}  models.EnrollmentValidationResponse
// @Security     BearerAuth
// @Router       /students/{id}/enrollments [post]
func (h *EnrollmentHandler) Submit(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	var req models.SubmitEnrollmentRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	validationErrs, err := h.service.Submit(c.Request.Context(), studentID, req)
	if err != nil {
		if errors.Is(err, services.ErrEnrollmentInvalid) {
			c.JSON(http.StatusUnprocessableEntity, models.EnrollmentValidationResponse{
				Valid:  false,
				Errors: validationErrs,
			})
			return
		}
		if errors.Is(err, services.ErrLevelHasNoGroups) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.EnrollmentValidationResponse{Valid: true, Errors: nil})
}

// ListByStudent godoc
// @Summary      List a student's subjects
// @Tags         enrollments
// @Produce      json
// @Param        id                path      string  true  "Student UUID"
// @Param        academic_year_id  query     string  true  "Academic year UUID"
// @Success      200               {array}   models.EnrollmentResponse
// @Failure      400               {object}  map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/enrollments [get]
func (h *EnrollmentHandler) ListByStudent(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	academicYearID, ok := requireAcademicYear(c)
	if !ok {
		return
	}

	enrollments, err := h.service.ListByStudent(c.Request.Context(), studentID, academicYearID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, enrollments)
}

// Delete godoc
// @Summary      Remove one enrollment pick
// @Tags         enrollments
// @Produce      json
// @Param        id                path      string  true  "Student UUID"
// @Param        group_id          path      string  true  "Group UUID"
// @Param        subject_id        path      string  true  "Subject UUID"
// @Param        academic_year_id  query     string  true  "Academic year UUID"
// @Success      200               {object}  map[string]string
// @Failure      400               {object}  map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/enrollments/{group_id}/{subject_id} [delete]
func (h *EnrollmentHandler) Delete(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	groupID, err := uuid.Parse(c.Param("group_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}

	subjectID, err := uuid.Parse(c.Param("subject_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid subject id"})
		return
	}

	academicYearID, ok := requireAcademicYear(c)
	if !ok {
		return
	}

	if err := h.service.Delete(c.Request.Context(), studentID, academicYearID, groupID, subjectID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "enrollment removed"})
}

// ListStudentsBySubject godoc
// @Summary      List students taking a subject
// @Tags         enrollments
// @Produce      json
// @Param        id                path      string  true  "Subject UUID"
// @Param        academic_year_id  query     string  true  "Academic year UUID"
// @Success      200               {array}   models.EnrolledStudentResponse
// @Failure      400               {object}  map[string]string
// @Security     BearerAuth
// @Router       /subjects/{id}/students [get]
func (h *EnrollmentHandler) ListStudentsBySubject(c *gin.Context) {
	subjectID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid subject id"})
		return
	}

	academicYearID, ok := requireAcademicYear(c)
	if !ok {
		return
	}

	students, err := h.service.ListStudentsBySubject(c.Request.Context(), subjectID, academicYearID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, students)
}

// ListStudentsByGroup godoc
// @Summary      List students enrolled through a group
// @Tags         enrollments
// @Produce      json
// @Param        group_id          path      string  true  "Group UUID"
// @Param        academic_year_id  query     string  true  "Academic year UUID"
// @Success      200               {array}   models.EnrolledStudentResponse
// @Failure      400               {object}  map[string]string
// @Security     BearerAuth
// @Router       /groups/{group_id}/students [get]
func (h *EnrollmentHandler) ListStudentsByGroup(c *gin.Context) {
	groupID, err := uuid.Parse(c.Param("group_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}

	academicYearID, ok := requireAcademicYear(c)
	if !ok {
		return
	}

	students, err := h.service.ListStudentsByGroup(c.Request.Context(), groupID, academicYearID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, students)
}
