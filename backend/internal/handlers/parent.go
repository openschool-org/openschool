package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/services"
	timetableservices "github.com/openschool-org/openschool/internal/services/timetable"
)

// ParentHandler serves the self-service endpoints a signed-in guardian uses
// to see their own linked children's details — never anyone else's, which
// is why every method here re-derives the caller's guardian identity from
// the token instead of trusting a student ID alone.
type ParentHandler struct {
	guardians  *services.GuardianService
	attendance *services.AttendanceService
	marks      *services.TermMarkService
	timetables *timetableservices.TimetableService
}

func NewParentHandler(guardians *services.GuardianService, attendance *services.AttendanceService, marks *services.TermMarkService, timetables *timetableservices.TimetableService) *ParentHandler {
	return &ParentHandler{guardians: guardians, attendance: attendance, marks: marks, timetables: timetables}
}

func (h *ParentHandler) callerID(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.GetString("userID"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return uuid.UUID{}, false
	}
	return id, true
}

// requireOwnChild aborts the request with 403 unless the caller is
// actually a guardian of the given student, and returns whether it's safe
// to proceed.
func (h *ParentHandler) requireOwnChild(c *gin.Context, callerID, studentID uuid.UUID) bool {
	ok, err := h.guardians.IsGuardianOfStudent(c.Request.Context(), callerID, studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return false
	}
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a guardian of this student"})
		return false
	}
	return true
}

// ListChildren godoc
// @Summary      List the signed-in parent's children
// @Tags         parent
// @Produce      json
// @Success      200  {array}   map[string]any
// @Failure      401  {object}  map[string]string
// @Security     BearerAuth
// @Router       /me/children [get]
func (h *ParentHandler) ListChildren(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}

	children, err := h.guardians.GetChildrenForUser(c.Request.Context(), callerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, children)
}

// ChildAttendance godoc
// @Summary      A linked child's attendance history
// @Tags         parent
// @Produce      json
// @Param        id   path      string  true  "Student UUID"
// @Success      200  {array}   map[string]any
// @Failure      403  {object}  map[string]string
// @Security     BearerAuth
// @Router       /me/children/{id}/attendance [get]
func (h *ParentHandler) ChildAttendance(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if !h.requireOwnChild(c, callerID, studentID) {
		return
	}

	records, err := h.attendance.ListByStudent(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, records)
}

// ChildMarks godoc
// @Summary      A linked child's term marks
// @Tags         parent
// @Produce      json
// @Param        id       path      string  true  "Student UUID"
// @Param        term_id  query     string  true  "Term UUID"
// @Success      200  {array}   map[string]any
// @Failure      403  {object}  map[string]string
// @Security     BearerAuth
// @Router       /me/children/{id}/marks [get]
func (h *ParentHandler) ChildMarks(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}
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
	if !h.requireOwnChild(c, callerID, studentID) {
		return
	}

	marks, err := h.marks.ListStudentMarks(c.Request.Context(), studentID, termID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, marks)
}

// ChildTimetable godoc
// @Summary      A linked child's published class timetable
// @Tags         parent
// @Produce      json
// @Param        id   path      string  true  "Student UUID"
// @Success      200  {object}  map[string]any
// @Failure      403  {object}  map[string]string
// @Security     BearerAuth
// @Router       /me/children/{id}/timetable [get]
func (h *ParentHandler) ChildTimetable(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if !h.requireOwnChild(c, callerID, studentID) {
		return
	}

	tt, entries, err := h.timetables.GetPublishedForStudent(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no published timetable found for this child's class"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"timetable": tt, "entries": entries})
}
