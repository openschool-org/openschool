package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

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

type StaffAttendanceHandler struct {
	service *services.StaffAttendanceService
}

func NewStaffAttendanceHandler(service *services.StaffAttendanceService) *StaffAttendanceHandler {
	return &StaffAttendanceHandler{service: service}
}

// Mark godoc
// @Summary      Mark staff attendance
// @Description  Upserts a single teacher's or non-academic staff member's attendance for a date
// @Tags         staff-attendance
// @Accept       json
// @Produce      json
// @Param        request body models.MarkStaffAttendanceRequest true "Attendance"
// @Success      200 {object} map[string]interface{}
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /staff-attendance [post]
func (h *StaffAttendanceHandler) Mark(c *gin.Context) {
	var req models.MarkStaffAttendanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	markedBy, err := uuid.Parse(c.GetString("userID"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return
	}

	record, err := h.service.MarkAttendance(c.Request.Context(), req, markedBy)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, record)
}

// ListByDate godoc
// @Summary      List staff attendance for a date
// @Description  Every active teacher and non-academic staff member's attendance status for the given date (unmarked staff show no status)
// @Tags         staff-attendance
// @Produce      json
// @Param        date query string true "Date (YYYY-MM-DD)"
// @Success      200 {object} map[string]interface{}
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /staff-attendance [get]
func (h *StaffAttendanceHandler) ListByDate(c *gin.Context) {
	date, err := time.Parse("2006-01-02", c.Query("date"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or missing date (expected YYYY-MM-DD)"})
		return
	}

	teachers, staff, err := h.service.ListByDate(c.Request.Context(), date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"teachers": teachers, "non_academic_staff": staff})
}

// MonthlySummary godoc
// @Summary      Monthly staff attendance summary
// @Description  Per-status counts (present/late/absent/leave) for every active staff member in the given month
// @Tags         staff-attendance
// @Produce      json
// @Param        year query int true "Year"
// @Param        month query int true "Month (1-12)"
// @Success      200 {object} map[string]interface{}
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /staff-attendance/monthly-summary [get]
func (h *StaffAttendanceHandler) MonthlySummary(c *gin.Context) {
	year, month, err := parseYearMonth(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	from := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	to := from.AddDate(0, 1, -1)

	teachers, staff, err := h.service.MonthlySummary(c.Request.Context(), from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"teachers": teachers, "non_academic_staff": staff})
}

// TeacherHistory godoc
// @Summary      A teacher's staff-attendance history for a month
// @Tags         staff-attendance
// @Produce      json
// @Param        id path string true "Teacher ID"
// @Param        year query int true "Year"
// @Param        month query int true "Month (1-12)"
// @Success      200 {array} models.StaffAttendanceRow
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /staff-attendance/teachers/{id}/history [get]
func (h *StaffAttendanceHandler) TeacherHistory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	year, month, err := parseYearMonth(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	from := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	to := from.AddDate(0, 1, -1)

	records, err := h.service.TeacherHistory(c.Request.Context(), id, from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, records)
}

// NonAcademicStaffHistory godoc
// @Summary      A non-academic staff member's attendance history for a month
// @Tags         staff-attendance
// @Produce      json
// @Param        id path string true "Staff ID"
// @Param        year query int true "Year"
// @Param        month query int true "Month (1-12)"
// @Success      200 {array} models.StaffAttendanceRow
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /staff-attendance/non-academic-staff/{id}/history [get]
func (h *StaffAttendanceHandler) NonAcademicStaffHistory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	year, month, err := parseYearMonth(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	from := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	to := from.AddDate(0, 1, -1)

	records, err := h.service.NonAcademicStaffHistory(c.Request.Context(), id, from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, records)
}
