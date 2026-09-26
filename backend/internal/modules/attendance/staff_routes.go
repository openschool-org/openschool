package attendance

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/platform/httpx"
)

type TeacherResolver interface {
	Resolve(context.Context, uuid.UUID) (uuid.UUID, error)
}

type staffHandler struct {
	service  *StaffService
	teachers TeacherResolver
}

func RegisterStaffRoutes(admin, teacher *gin.RouterGroup, service *StaffService, teachers TeacherResolver) {
	h := &staffHandler{service: service, teachers: teachers}
	admin.POST("/staff-attendance", h.mark)
	admin.GET("/staff-attendance", h.listByDate)
	admin.GET("/staff-attendance/monthly-summary", h.monthlySummary)
	admin.GET("/staff-attendance/roster", h.roster)
	admin.GET("/staff-attendance/monthly", h.monthly)
	admin.POST("/staff-attendance/mark-unmarked", h.markUnmarked)
	admin.GET("/staff-attendance/teachers/:id/history", h.teacherHistory)
	admin.GET("/staff-attendance/non-academic-staff/:id/history", h.nonAcademicHistory)
	teacher.GET("/me/teacher/attendance", h.myTeacherHistory)
}

func parseYearMonth(c *gin.Context) (int, int, error) {
	year, err := strconv.Atoi(c.Query("year"))
	if err != nil {
		return 0, 0, fmt.Errorf("invalid or missing year")
	}
	month, err := strconv.Atoi(c.Query("month"))
	if err != nil || month < 1 || month > 12 {
		return 0, 0, fmt.Errorf("invalid or missing month (expected 1-12)")
	}
	return year, month, nil
}

func monthRange(c *gin.Context) (time.Time, time.Time, bool) {
	year, month, err := parseYearMonth(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return time.Time{}, time.Time{}, false
	}
	from := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	return from, from.AddDate(0, 1, -1), true
}

func (h *staffHandler) mark(c *gin.Context) {
	var req MarkStaffAttendanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	markedBy, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}
	record, err := h.service.Mark(c, req, markedBy)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, record)
}

func (h *staffHandler) listByDate(c *gin.Context) {
	date, err := time.Parse("2006-01-02", c.Query("date"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or missing date (expected YYYY-MM-DD)"})
		return
	}
	teachers, staff, err := h.service.ListByDate(c, date)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"teachers": teachers, "non_academic_staff": staff})
}

func (h *staffHandler) monthlySummary(c *gin.Context) {
	from, to, ok := monthRange(c)
	if !ok {
		return
	}
	teachers, staff, err := h.service.MonthlySummary(c, from, to)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"teachers": teachers, "non_academic_staff": staff})
}

func (h *staffHandler) teacherHistory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	from, to, ok := monthRange(c)
	if !ok {
		return
	}
	records, err := h.service.TeacherHistory(c, id, from, to)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, records)
}

func (h *staffHandler) nonAcademicHistory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	from, to, ok := monthRange(c)
	if !ok {
		return
	}
	records, err := h.service.NonAcademicHistory(c, id, from, to)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, records)
}

func (h *staffHandler) myTeacherHistory(c *gin.Context) {
	callerID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}
	teacherID, err := h.teachers.Resolve(c, callerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no teacher profile linked to this account"})
		return
	}
	from, to, ok := monthRange(c)
	if !ok {
		return
	}
	records, err := h.service.TeacherHistory(c, teacherID, from, to)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, records)
}

// rosterQuery reads kind plus the shared limit/offset/search contract.
func rosterQuery(c *gin.Context) (StaffRosterQuery, bool) {
	kind := StaffKind(c.Query("kind"))
	if kind != StaffKindTeacher && kind != StaffKindStaff {
		c.JSON(http.StatusBadRequest, gin.H{"error": "kind must be teacher or staff"})
		return StaffRosterQuery{}, false
	}
	p := httpx.ParsePage(c)
	return StaffRosterQuery{Kind: kind, Search: p.Search, Limit: p.Limit, Offset: p.Offset}, true
}

func (h *staffHandler) roster(c *gin.Context) {
	date, err := time.Parse("2006-01-02", c.Query("date"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or missing date (expected YYYY-MM-DD)"})
		return
	}
	q, ok := rosterQuery(c)
	if !ok {
		return
	}
	page, err := h.service.Roster(c, date, q)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, page)
}

func (h *staffHandler) monthly(c *gin.Context) {
	from, to, ok := monthRange(c)
	if !ok {
		return
	}
	q, ok := rosterQuery(c)
	if !ok {
		return
	}
	page, err := h.service.Monthly(c, from, to, q)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, page)
}

func (h *staffHandler) markUnmarked(c *gin.Context) {
	var req MarkUnmarkedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "date and kind (teacher or staff) are required"})
		return
	}
	markedBy, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}
	n, err := h.service.MarkUnmarkedPresent(c, req, markedBy)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"marked": n})
}
