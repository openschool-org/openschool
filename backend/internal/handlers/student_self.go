package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
)

// StudentSelfHandler serves the self-service endpoints a signed-in student
// uses to see their own profile, attendance, and marks — resolved from
// their own token, never from a trusted student ID in the URL.
type StudentSelfHandler struct {
	students   *repositories.StudentRepository
	attendance *services.AttendanceService
	marks      *services.TermMarkService
}

func NewStudentSelfHandler(students *repositories.StudentRepository, attendance *services.AttendanceService, marks *services.TermMarkService) *StudentSelfHandler {
	return &StudentSelfHandler{students: students, attendance: attendance, marks: marks}
}

func (h *StudentSelfHandler) resolveStudentID(c *gin.Context) (uuid.UUID, bool) {
	callerID, err := uuid.Parse(c.GetString("userID"))
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
