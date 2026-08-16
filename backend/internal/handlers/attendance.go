package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/middleware"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

// statusForAttendanceError maps a not-assigned-to-class failure to 403
// (distinct from a genuine 404/400), so callers can tell "you can't see
// this" apart from "this doesn't exist" or "bad input."
func statusForAttendanceError(err error, notFoundStatus int) int {
	if errors.Is(err, services.ErrNotAssignedToClass) || errors.Is(err, services.ErrInsufficientRank) {
		return http.StatusForbidden
	}
	if errors.Is(err, services.ErrSessionLocked) {
		return http.StatusLocked
	}
	return notFoundStatus
}

type AttendanceHandler struct {
	service *services.AttendanceService
}

func NewAttendanceHandler(service *services.AttendanceService) *AttendanceHandler {
	return &AttendanceHandler{service: service}
}

// actorFromContext builds a services.Actor from the JWT claims AuthMiddleware
// already put on the gin context. Shared by any handler that needs to know
// who's acting, not just who's authenticated (e.g. for assignment checks).
func actorFromContext(c *gin.Context) (services.Actor, error) {
	id, err := middleware.UserIDFromContext(c)
	if err != nil {
		return services.Actor{}, fmt.Errorf("invalid caller identity")
	}

	var roleList []string
	if roles, ok := c.Get("roles"); ok {
		roleList, _ = roles.([]string)
	}

	return services.Actor{
		ID:       id,
		Email:    c.GetString("email"),
		FullName: strings.TrimSpace(c.GetString("given_name") + " " + c.GetString("family_name")),
		Role:     services.ResolveAppRole(roleList),
	}, nil
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

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	session, err := h.service.CreateSession(c.Request.Context(), actor, req)
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

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	session, err := h.service.GetSession(c.Request.Context(), actor, id)
	if err != nil {
		c.JSON(statusForAttendanceError(err, http.StatusNotFound), gin.H{"error": err.Error()})
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

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.DeleteSession(c.Request.Context(), actor, id); err != nil {
		c.JSON(statusForAttendanceError(err, http.StatusNotFound), gin.H{"error": err.Error()})
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

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	sessions, err := h.service.ListSessionsByClass(c.Request.Context(), actor, classID)
	if err != nil {
		c.JSON(statusForAttendanceError(err, http.StatusInternalServerError), gin.H{"error": err.Error()})
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

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	sessions, err := h.service.ListSessionsByDate(c.Request.Context(), actor, date)
	if err != nil {
		c.JSON(statusForAttendanceError(err, http.StatusBadRequest), gin.H{"error": err.Error()})
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

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.MarkAttendance(c.Request.Context(), actor, id, req); err != nil {
		c.JSON(statusForAttendanceError(err, http.StatusBadRequest), gin.H{"error": err.Error()})
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

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	records, err := h.service.ListBySession(c.Request.Context(), actor, id)
	if err != nil {
		c.JSON(statusForAttendanceError(err, http.StatusInternalServerError), gin.H{"error": err.Error()})
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

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	records, err := h.service.ListByStudentForTeacher(c.Request.Context(), actor, id)
	if err != nil {
		c.JSON(statusForAttendanceError(err, http.StatusInternalServerError), gin.H{"error": err.Error()})
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

	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	summary, err := h.service.GetSummaryForTeacher(c.Request.Context(), actor, studentID, classID)
	if err != nil {
		c.JSON(statusForAttendanceError(err, http.StatusInternalServerError), gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}
