package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type AttendanceHandler struct {
	service *services.AttendanceService
}

func NewAttendanceHandler(service *services.AttendanceService) *AttendanceHandler {
	return &AttendanceHandler{service: service}
}

// CreateSession godoc
// @Summary      Create attendance session
// @Description  Create a new attendance session for a class on a specific date
// @Tags         attendance
// @Accept       json
// @Produce      json
// @Param        request body models.CreateAttendanceSessionRequest true "Session details"
// @Success      201 {object} models.AttendanceSessionResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /attendance/sessions [post]
func (h *AttendanceHandler) CreateSession(c *gin.Context) {
	var req models.CreateAttendanceSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	takenByID, err := uuid.Parse(c.GetString("userID"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user"})
		return
	}

	isAdmin := false
	if roles, ok := c.Get("roles"); ok {
		if roleList, ok := roles.([]string); ok {
			for _, r := range roleList {
				if r == "admin" {
					isAdmin = true
					break
				}
			}
		}
	}

	session, err := h.service.CreateSession(c.Request.Context(), takenByID, isAdmin, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, session)
}

// GetSession godoc
// @Summary      Get attendance session
// @Description  Get an attendance session by ID
// @Tags         attendance
// @Produce      json
// @Param        id path string true "Session ID"
// @Success      200 {object} models.AttendanceSessionResponse
// @Failure      404 {object} map[string]string
// @Security     BearerAuth
// @Router       /attendance/sessions/{id} [get]
func (h *AttendanceHandler) GetSession(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	session, err := h.service.GetSession(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	c.JSON(http.StatusOK, session)
}

// DeleteSession godoc
// @Summary      Delete attendance session
// @Description  Delete a session and every attendance record already written for it
// @Tags         attendance
// @Produce      json
// @Param        id path string true "Session ID"
// @Success      200 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Security     BearerAuth
// @Router       /attendance/sessions/{id} [delete]
func (h *AttendanceHandler) DeleteSession(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.service.DeleteSession(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "attendance session deleted"})
}

// ListSessionsByClass godoc
// @Summary      List attendance sessions by class
// @Description  Get all attendance sessions for a specific class
// @Tags         attendance
// @Produce      json
// @Param        id path string true "Class ID"
// @Success      200 {array} models.AttendanceSessionResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /classes/{id}/attendance/sessions [get]
func (h *AttendanceHandler) ListSessionsByClass(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class id"})
		return
	}

	sessions, err := h.service.ListSessionsByClass(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, sessions)
}

// ListSessionsByDate godoc
// @Summary      List sessions for a date
// @Description  Cross-class attendance dashboard: every session on one date, with class/grade/teacher resolved and marked/enrolled counts
// @Tags         attendance
// @Produce      json
// @Param        date query string true "Date, YYYY-MM-DD"
// @Success      200 {array} models.AttendanceSessionResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /attendance/sessions [get]
func (h *AttendanceHandler) ListSessionsByDate(c *gin.Context) {
	date := c.Query("date")
	if date == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "date query parameter is required"})
		return
	}

	sessions, err := h.service.ListSessionsByDate(c.Request.Context(), date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, sessions)
}

// MarkAttendance godoc
// @Summary      Mark attendance
// @Description  Mark attendance for all students in a session
// @Tags         attendance
// @Accept       json
// @Produce      json
// @Param        id path string true "Session ID"
// @Param        request body models.MarkAttendanceRequest true "Attendance records"
// @Success      200 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /attendance/sessions/{id}/records [post]
func (h *AttendanceHandler) MarkAttendance(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session id"})
		return
	}

	var req models.MarkAttendanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.MarkAttendance(c.Request.Context(), id, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "attendance marked"})
}

// ListBySession godoc
// @Summary      List attendance by session
// @Description  Get all attendance records for a session
// @Tags         attendance
// @Produce      json
// @Param        id path string true "Session ID"
// @Success      200 {array} models.AttendanceRecordResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /attendance/sessions/{id}/records [get]
func (h *AttendanceHandler) ListBySession(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session id"})
		return
	}

	records, err := h.service.ListBySession(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, records)
}

// ListByStudent godoc
// @Summary      List attendance by student
// @Description  Get all attendance records for a student
// @Tags         attendance
// @Produce      json
// @Param        id path string true "Student ID"
// @Success      200 {array} models.AttendanceRecordResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/attendance [get]
func (h *AttendanceHandler) ListByStudent(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	records, err := h.service.ListByStudent(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, records)
}

// GetSummary godoc
// @Summary      Get attendance summary
// @Description  Get attendance summary for a student in a specific class
// @Tags         attendance
// @Produce      json
// @Param        student_id path string true "Student ID"
// @Param        class_id path string true "Class ID"
// @Success      200 {object} models.AttendanceSummaryResponse
// @Failure      400 {object} map[string]string
// @Security     BearerAuth
// @Router       /students/{id}/attendance/summary/{class_id} [get]
func (h *AttendanceHandler) GetSummary(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class id"})
		return
	}

	summary, err := h.service.GetSummary(c.Request.Context(), studentID, classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}
