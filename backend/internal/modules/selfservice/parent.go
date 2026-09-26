package selfservice

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/middleware"
	academicsmodule "github.com/openschool-org/openschool/internal/modules/academics"
	attendancemodule "github.com/openschool-org/openschool/internal/modules/attendance"
	"github.com/openschool-org/openschool/internal/ports"
)

// ParentHandler serves a signed-in guardian's own-children endpoints, always re-deriving identity from the token.
type ParentHandler struct {
	guardians  ports.GuardianAccess
	attendance attendancemodule.Reader
	marks      academicsmodule.TermMarkReader
	timetables TimetableReader
}

// NewParentHandler constructs a ParentHandler with its service dependencies.
func NewParentHandler(guardians ports.GuardianAccess, attendance attendancemodule.Reader, marks academicsmodule.TermMarkReader, timetables TimetableReader) *ParentHandler {
	return &ParentHandler{guardians: guardians, attendance: attendance, marks: marks, timetables: timetables}
}

// callerID resolves the signed-in guardian's user ID from the request's JWT.
func (h *ParentHandler) callerID(c *gin.Context) (uuid.UUID, bool) {
	id, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return uuid.UUID{}, false
	}
	return id, true
}

// requireOwnChild aborts with 403 unless the caller is a guardian of the given student.
func (h *ParentHandler) requireOwnChild(c *gin.Context, callerID, studentID uuid.UUID) bool {
	ok, err := h.guardians.IsGuardianOfStudent(c.Request.Context(), callerID, studentID)
	if err != nil {
		apierror.RespondInternal(c, err)
		return false
	}
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a guardian of this student"})
		return false
	}
	return true
}

// ListChildren lists the signed-in parent's children.
func (h *ParentHandler) ListChildren(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}

	children, err := h.guardians.ChildrenForUser(c.Request.Context(), callerID)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}

	c.JSON(http.StatusOK, children)
}

// ChildrenSummary returns this month's attendance and the latest term average for every linked child in one call.
func (h *ParentHandler) ChildrenSummary(c *gin.Context) {
	callerID, ok := h.callerID(c)
	if !ok {
		return
	}

	summary, err := h.guardians.ChildrenSummaryForUser(c.Request.Context(), callerID)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}

	c.JSON(http.StatusOK, summary)
}

// ChildAttendance returns a linked child's attendance history.
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
		apierror.RespondInternal(c, err)
		return
	}

	c.JSON(http.StatusOK, records)
}

// ChildMarks returns a linked child's term marks.
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
		apierror.RespondInternal(c, err)
		return
	}

	c.JSON(http.StatusOK, marks)
}

// ChildTimetable returns a linked child's published class timetable.
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
