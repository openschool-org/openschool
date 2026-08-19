package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
	timetableservices "github.com/openschool-org/openschool/internal/services/timetable"
)

// TeacherSelfHandler serves the self-service endpoints a signed-in teacher
// uses to resolve their own teacher_profile ID — everything else (classes,
// subjects, attendance, marks) is then fetched via the existing
// teacherOrAdmin routes (e.g. GET /teachers/:id/workload) using that ID,
// exactly like the admin UI would for any other teacher.
type TeacherSelfHandler struct {
	teachers   *repositories.TeacherRepository
	school     *repositories.SchoolRepository
	positions  *services.PositionService
	societies  *services.SocietyService
	dashboard  *services.DashboardService
	timetables *timetableservices.TimetableService
}

func NewTeacherSelfHandler(
	teachers *repositories.TeacherRepository,
	school *repositories.SchoolRepository,
	positions *services.PositionService,
	societies *services.SocietyService,
	dashboard *services.DashboardService,
	timetables *timetableservices.TimetableService,
) *TeacherSelfHandler {
	return &TeacherSelfHandler{
		teachers:   teachers,
		school:     school,
		positions:  positions,
		societies:  societies,
		dashboard:  dashboard,
		timetables: timetables,
	}
}

// leadershipTeacher resolves the caller's teacher profile and current
// academic year, and 403s unless their computed rank is Principal or Vice
// Principal — the shared gate for the "monitor" endpoints (Analytics,
// Timetables) that only those two ranks get, unlike the broader Section
// Head+ gate LeadershipOverview uses.
func (h *TeacherSelfHandler) leadershipTeacher(c *gin.Context) (db.TeacherProfile, bool) {
	callerID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return db.TeacherProfile{}, false
	}

	teacher, err := h.teachers.GetByUserID(c.Request.Context(), callerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no teacher profile linked to this account"})
		return db.TeacherProfile{}, false
	}

	year, err := h.school.GetCurrentAcademicYear(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no current academic year configured"})
		return db.TeacherProfile{}, false
	}

	rank, _, err := h.positions.RankForTeacher(c.Request.Context(), teacher.ID, year.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return db.TeacherProfile{}, false
	}
	if !rank.IsPrincipalOrVicePrincipal() {
		c.JSON(http.StatusForbidden, gin.H{"error": "this action requires the Principal or Vice Principal position"})
		return db.TeacherProfile{}, false
	}

	return teacher, true
}

// Profile godoc
// @Summary      The signed-in teacher's own profile
// @Tags         teacher
// @Produce      json
// @Success      200  {object}  map[string]any
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /me/teacher [get]
func (h *TeacherSelfHandler) Profile(c *gin.Context) {
	callerID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}

	teacher, err := h.teachers.GetByUserID(c.Request.Context(), callerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no teacher profile linked to this account"})
		return
	}

	c.JSON(http.StatusOK, teacher)
}

// Position godoc
// @Summary      The signed-in teacher's leadership position rank and notification reach
// @Description  Used by the teacher dashboard/notification composer to tailor themselves to the caller's role in the hierarchy (Principal, Vice Principal, Section Head, Class Teacher, Subject Teacher, Teacher)
// @Tags         teacher
// @Produce      json
// @Success      200  {object}  services.PositionSummary
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /me/teacher/position [get]
func (h *TeacherSelfHandler) Position(c *gin.Context) {
	callerID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}

	teacher, err := h.teachers.GetByUserID(c.Request.Context(), callerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no teacher profile linked to this account"})
		return
	}

	year, err := h.school.GetCurrentAcademicYear(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no current academic year configured"})
		return
	}

	summary, err := h.positions.SummaryForTeacher(c.Request.Context(), teacher.ID, year.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// Society godoc
// @Summary      The society the signed-in teacher is Teacher-in-Charge of, for the current academic year
// @Tags         teacher
// @Produce      json
// @Success      200  {object}  map[string]any
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /me/teacher/society [get]
func (h *TeacherSelfHandler) Society(c *gin.Context) {
	callerID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}

	teacher, err := h.teachers.GetByUserID(c.Request.Context(), callerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no teacher profile linked to this account"})
		return
	}

	year, err := h.school.GetCurrentAcademicYear(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no current academic year configured"})
		return
	}

	society, err := h.societies.GetForTeacher(c.Request.Context(), teacher.ID, year.ID)
	if err != nil {
		if errors.Is(err, services.ErrSocietyNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "you are not the Teacher-in-Charge of any society this year"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, society)
}

// LeadershipOverview godoc
// @Summary      The signed-in teacher's leadership overview panel data
// @Description  Real, scoped counts (classes/students/today's attendance) for Principal, Vice Principal, and Section Head — 403 for anyone below Section Head, not empty data
// @Tags         teacher
// @Produce      json
// @Success      200  {object}  services.LeadershipOverviewSummary
// @Failure      403  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /me/teacher/leadership-overview [get]
func (h *TeacherSelfHandler) LeadershipOverview(c *gin.Context) {
	callerID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}

	teacher, err := h.teachers.GetByUserID(c.Request.Context(), callerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no teacher profile linked to this account"})
		return
	}

	year, err := h.school.GetCurrentAcademicYear(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no current academic year configured"})
		return
	}

	overview, err := h.positions.LeadershipOverview(c.Request.Context(), teacher.ID, year.ID)
	if err != nil {
		if errors.Is(err, services.ErrInsufficientRank) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, overview)
}

// Analytics godoc
// @Summary      School-wide analytics for the signed-in Principal/Vice Principal
// @Description  Same composed analytics as the admin dashboard — Principal/VP are whole-school monitors by design (ADR 0002), so this isn't grade-scoped. 403 for any other rank.
// @Tags         teacher
// @Produce      json
// @Success      200  {object}  models.DashboardAnalyticsResponse
// @Failure      403  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /me/teacher/analytics [get]
func (h *TeacherSelfHandler) Analytics(c *gin.Context) {
	if _, ok := h.leadershipTeacher(c); !ok {
		return
	}

	analytics, err := h.dashboard.Analytics(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, analytics)
}

// Timetables godoc
// @Summary      Every class's timetable for the current academic year, for the signed-in Principal/Vice Principal
// @Description  Same listing as the admin Timetables page, read-only here. 403 for any other rank.
// @Tags         teacher
// @Produce      json
// @Success      200  {array}   db.ListTimetablesByAcademicYearRow
// @Failure      403  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /me/teacher/timetables [get]
func (h *TeacherSelfHandler) Timetables(c *gin.Context) {
	if _, ok := h.leadershipTeacher(c); !ok {
		return
	}

	year, err := h.school.GetCurrentAcademicYear(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no current academic year configured"})
		return
	}

	list, err := h.timetables.ListByAcademicYear(c.Request.Context(), year.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, list)
}
