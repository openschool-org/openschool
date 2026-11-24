package selfservice

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/middleware"
	leadershipmodule "github.com/openschool-org/openschool/internal/modules/leadership"
	studentleadershipmodule "github.com/openschool-org/openschool/internal/modules/studentleadership"
)

// TeacherSelfHandler resolves a signed-in teacher's own profile ID for the existing teacherOrAdmin routes to use.
type TeacherSelfHandler struct {
	teacherSelf *TeacherProfiles
	positions   LeadershipReader
	societies   SocietyReader
	dashboard   DashboardReader
	timetables  TimetableReader
}

// NewTeacherSelfHandler constructs a TeacherSelfHandler with its service dependencies.
func NewTeacherSelfHandler(
	teacherSelf *TeacherProfiles,
	positions LeadershipReader,
	societies SocietyReader,
	dashboard DashboardReader,
	timetables TimetableReader,
) *TeacherSelfHandler {
	return &TeacherSelfHandler{
		teacherSelf: teacherSelf,
		positions:   positions,
		societies:   societies,
		dashboard:   dashboard,
		timetables:  timetables,
	}
}

// currentTeacher resolves the caller's teacher profile and the current academic year, or writes the error.
func (h *TeacherSelfHandler) currentTeacher(c *gin.Context) (teacherID, yearID uuid.UUID, ok bool) {
	callerID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return uuid.Nil, uuid.Nil, false
	}
	teacherID, err = h.teacherSelf.Resolve(c.Request.Context(), callerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no teacher profile linked to this account"})
		return uuid.Nil, uuid.Nil, false
	}
	yearID, err = h.teacherSelf.CurrentAcademicYearID(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no current academic year configured"})
		return uuid.Nil, uuid.Nil, false
	}
	return teacherID, yearID, true
}

// leadershipTeacher resolves the caller's teacher profile and 403s unless their rank is Principal or Vice Principal.
func (h *TeacherSelfHandler) leadershipTeacher(c *gin.Context) (uuid.UUID, bool) {
	teacherID, yearID, ok := h.currentTeacher(c)
	if !ok {
		return uuid.Nil, false
	}

	rank, _, err := h.positions.RankForTeacher(c.Request.Context(), teacherID, yearID)
	if err != nil {
		apierror.RespondInternal(c, err)
		return uuid.Nil, false
	}
	if !rank.IsPrincipalOrVicePrincipal() {
		c.JSON(http.StatusForbidden, gin.H{"error": "this action requires the Principal or Vice Principal position"})
		return uuid.Nil, false
	}

	return teacherID, true
}

// Profile returns the signed-in teacher's own profile.
func (h *TeacherSelfHandler) Profile(c *gin.Context) {
	callerID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}

	teacher, err := h.teacherSelf.Profile(c.Request.Context(), callerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no teacher profile linked to this account"})
		return
	}

	c.JSON(http.StatusOK, teacher)
}

// Position returns the signed-in teacher's leadership rank and notification reach.
func (h *TeacherSelfHandler) Position(c *gin.Context) {
	teacherID, yearID, ok := h.currentTeacher(c)
	if !ok {
		return
	}

	summary, err := h.positions.SummaryForTeacher(c.Request.Context(), teacherID, yearID)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}

	c.JSON(http.StatusOK, summary)
}

// Society returns the society the signed-in teacher is Teacher-in-Charge of, for the current academic year.
func (h *TeacherSelfHandler) Society(c *gin.Context) {
	teacherID, yearID, ok := h.currentTeacher(c)
	if !ok {
		return
	}

	society, err := h.societies.GetSocietyForTeacher(c.Request.Context(), teacherID, yearID)
	if err != nil {
		if errors.Is(err, studentleadershipmodule.ErrSocietyNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "you are not the Teacher-in-Charge of any society this year"})
			return
		}
		apierror.RespondInternal(c, err)
		return
	}

	c.JSON(http.StatusOK, society)
}

// LeadershipOverview returns the signed-in teacher's scoped leadership-panel counts (Section Head and above only).
func (h *TeacherSelfHandler) LeadershipOverview(c *gin.Context) {
	teacherID, yearID, ok := h.currentTeacher(c)
	if !ok {
		return
	}

	overview, err := h.positions.LeadershipOverview(c.Request.Context(), teacherID, yearID)
	if err != nil {
		if errors.Is(err, leadershipmodule.ErrInsufficientRank) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		apierror.RespondInternal(c, err)
		return
	}

	c.JSON(http.StatusOK, overview)
}

// LedClasses returns the classes the signed-in section head (or principal / vice principal) oversees.
func (h *TeacherSelfHandler) LedClasses(c *gin.Context) {
	teacherID, yearID, ok := h.currentTeacher(c)
	if !ok {
		return
	}
	classes, err := h.positions.LedClasses(c.Request.Context(), teacherID, yearID)
	if errors.Is(err, leadershipmodule.ErrInsufficientRank) {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, classes)
}

// Analytics returns school-wide analytics for the signed-in Principal or Vice Principal.
func (h *TeacherSelfHandler) Analytics(c *gin.Context) {
	if _, ok := h.leadershipTeacher(c); !ok {
		return
	}

	analytics, err := h.dashboard.Analytics(c.Request.Context())
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}

	c.JSON(http.StatusOK, analytics)
}

// Timetables returns the same listing as the admin Timetables page, read-only, for Principal/Vice Principal.
func (h *TeacherSelfHandler) Timetables(c *gin.Context) {
	if _, ok := h.leadershipTeacher(c); !ok {
		return
	}

	yearID, err := h.teacherSelf.CurrentAcademicYearID(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no current academic year configured"})
		return
	}

	list, err := h.timetables.ListByAcademicYear(c.Request.Context(), yearID)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}

	c.JSON(http.StatusOK, list)
}
