package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

// StudentSelfHandler serves the self-service endpoints a signed-in student
// uses to see their own profile, attendance, marks, and subject selection —
// resolved from their own token, never from a trusted student ID in the URL.
type StudentSelfHandler struct {
	students    *repositories.StudentRepository
	attendance  *services.AttendanceService
	marks       *services.TermMarkService
	enrollments *services.EnrollmentService
}

func NewStudentSelfHandler(students *repositories.StudentRepository, attendance *services.AttendanceService, marks *services.TermMarkService, enrollments *services.EnrollmentService) *StudentSelfHandler {
	return &StudentSelfHandler{students: students, attendance: attendance, marks: marks, enrollments: enrollments}
}

func (h *StudentSelfHandler) resolveStudentID(c *gin.Context) (uuid.UUID, bool) {
	callerID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return uuid.UUID{}, false
	}
	student, err := h.students.GetByUserID(c.Request.Context(), callerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no student profile linked to this account"})
		return uuid.UUID{}, false
	}
	return student.ID, true
}

// Profile godoc
// @Summary      The signed-in student's own profile
// @Tags         student
// @Produce      json
// @Success      200  {object}  map[string]any
// @Security     BearerAuth
// @Router       /me/student [get]
func (h *StudentSelfHandler) Profile(c *gin.Context) {
	studentID, ok := h.resolveStudentID(c)
	if !ok {
		return
	}

	profile, err := h.students.GetWithClass(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, profile)
}

// Attendance godoc
// @Summary      The signed-in student's own attendance history
// @Tags         student
// @Produce      json
// @Success      200  {array}   map[string]any
// @Security     BearerAuth
// @Router       /me/student/attendance [get]
func (h *StudentSelfHandler) Attendance(c *gin.Context) {
	studentID, ok := h.resolveStudentID(c)
	if !ok {
		return
	}

	records, err := h.attendance.ListByStudent(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, records)
}

// Marks godoc
// @Summary      The signed-in student's own term marks
// @Tags         student
// @Produce      json
// @Param        term_id  query     string  true  "Term UUID"
// @Success      200  {array}   map[string]any
// @Security     BearerAuth
// @Router       /me/student/marks [get]
func (h *StudentSelfHandler) Marks(c *gin.Context) {
	studentID, ok := h.resolveStudentID(c)
	if !ok {
		return
	}
	termID, err := uuid.Parse(c.Query("term_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or missing term_id"})
		return
	}

	marks, err := h.marks.ListStudentMarks(c.Request.Context(), studentID, termID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, marks)
}

// ListEnrollments godoc
// @Summary      The signed-in student's own subject picks for a level
// @Tags         student
// @Produce      json
// @Param        level_id          query     string  true  "Level UUID"
// @Param        academic_year_id  query     string  true  "Academic year UUID"
// @Success      200  {array}   models.EnrollmentResponse
// @Security     BearerAuth
// @Router       /me/student/enrollments [get]
func (h *StudentSelfHandler) ListEnrollments(c *gin.Context) {
	studentID, ok := h.resolveStudentID(c)
	if !ok {
		return
	}

	levelID, err := uuid.Parse(c.Query("level_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or missing level_id"})
		return
	}
	academicYearID, err := uuid.Parse(c.Query("academic_year_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or missing academic_year_id"})
		return
	}

	picks, err := h.enrollments.ListByStudentAndLevel(c.Request.Context(), studentID, levelID, academicYearID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	locked, err := h.enrollments.IsLocked(c.Request.Context(), studentID, levelID, academicYearID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"picks": picks, "locked": locked})
}

// SubmitEnrollment godoc
// @Summary      Submit the signed-in student's own subject picks
// @Description  Validates then replaces the student's picks for a level+year; rejected if already confirmed/locked
// @Tags         student
// @Accept       json
// @Produce      json
// @Param        request  body      models.SubmitEnrollmentRequest  true  "Picks"
// @Success      200      {object}  models.EnrollmentValidationResponse
// @Failure      400      {object}  map[string]string
// @Failure      409      {object}  map[string]string
// @Failure      422      {object}  models.EnrollmentValidationResponse
// @Security     BearerAuth
// @Router       /me/student/enrollments [post]
func (h *StudentSelfHandler) SubmitEnrollment(c *gin.Context) {
	studentID, ok := h.resolveStudentID(c)
	if !ok {
		return
	}

	var req models.SubmitEnrollmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	validationErrs, err := h.enrollments.Submit(c.Request.Context(), studentID, req)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrEnrollmentInvalid):
			c.JSON(http.StatusUnprocessableEntity, models.EnrollmentValidationResponse{Valid: false, Errors: validationErrs})
		case errors.Is(err, services.ErrEnrollmentLocked):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrLevelHasNoGroups):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, models.EnrollmentValidationResponse{Valid: true, Errors: nil})
}

// ConfirmEnrollment godoc
// @Summary      Confirm and lock the signed-in student's subject picks
// @Description  Once confirmed, picks for this level+year can't be changed until an admin unlocks them
// @Tags         student
// @Accept       json
// @Produce      json
// @Param        request  body      models.ConfirmEnrollmentRequest  true  "Level + academic year"
// @Success      200      {object}  map[string]string
// @Failure      400      {object}  map[string]string
// @Security     BearerAuth
// @Router       /me/student/enrollments/confirm [post]
func (h *StudentSelfHandler) ConfirmEnrollment(c *gin.Context) {
	studentID, ok := h.resolveStudentID(c)
	if !ok {
		return
	}

	var req models.ConfirmEnrollmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	levelID, err := uuid.Parse(req.LevelID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid level_id"})
		return
	}
	academicYearID, err := uuid.Parse(req.AcademicYearID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid academic_year_id"})
		return
	}

	if err := h.enrollments.Confirm(c.Request.Context(), studentID, levelID, academicYearID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "subject selection confirmed and locked"})
}
