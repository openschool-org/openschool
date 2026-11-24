package attendance

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/middleware"
)

type handler struct{ service *Service }

func RegisterRoutes(group *gin.RouterGroup, service *Service) {
	h := &handler{service: service}
	group.POST("/attendance/sessions", h.createSession)
	group.GET("/attendance/sessions", h.listSessionsByDate)
	group.GET("/attendance/sessions/:id", h.getSession)
	group.DELETE("/attendance/sessions/:id", h.deleteSession)
	group.POST("/attendance/sessions/:id/records", h.markAttendance)
	group.GET("/attendance/sessions/:id/records", h.listBySession)
	group.GET("/classes/:id/attendance/sessions", h.listSessionsByClass)
	group.GET("/students/:id/attendance", h.listByStudent)
	group.GET("/students/:id/attendance/summary/:class_id", h.summary)
}

func statusForError(err error, fallback int) int {
	if errors.Is(err, ErrNotAssignedToClass) || errors.Is(err, ErrNotClassTeacher) || errors.Is(err, ErrNotSectionHead) || errors.Is(err, ErrInsufficientRank) {
		return http.StatusForbidden
	}
	if errors.Is(err, ErrSessionLocked) {
		return http.StatusLocked
	}
	return fallback
}

func actorFromContext(c *gin.Context) (Actor, error) {
	id, err := middleware.UserIDFromContext(c)
	if err != nil {
		return Actor{}, fmt.Errorf("invalid caller identity")
	}
	var roles []string
	if value, ok := c.Get("roles"); ok {
		roles, _ = value.([]string)
	}
	return Actor{ID: id, Email: c.GetString("email"), FullName: strings.TrimSpace(c.GetString("given_name") + " " + c.GetString("family_name")), Role: authz.ResolveAppRole(roles)}, nil
}

func actorOrAbort(c *gin.Context) (Actor, bool) {
	actor, err := actorFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return Actor{}, false
	}
	return actor, true
}

func uuidParam(c *gin.Context, name, message string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(name))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": message})
		return uuid.Nil, false
	}
	return id, true
}

func (h *handler) createSession(c *gin.Context) {
	var req CreateAttendanceSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	actor, ok := actorOrAbort(c)
	if !ok {
		return
	}
	session, err := h.service.CreateSession(c, actor, req)
	if err != nil {
		c.JSON(statusForError(err, http.StatusBadRequest), gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, session)
}

func (h *handler) getSession(c *gin.Context) {
	id, ok := uuidParam(c, "id", "invalid id")
	if !ok {
		return
	}
	actor, ok := actorOrAbort(c)
	if !ok {
		return
	}
	session, err := h.service.GetSession(c, actor, id)
	if err != nil {
		c.JSON(statusForError(err, http.StatusNotFound), gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, session)
}

func (h *handler) deleteSession(c *gin.Context) {
	id, ok := uuidParam(c, "id", "invalid id")
	if !ok {
		return
	}
	actor, ok := actorOrAbort(c)
	if !ok {
		return
	}
	if err := h.service.DeleteSession(c, actor, id); err != nil {
		c.JSON(statusForError(err, http.StatusNotFound), gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "attendance session deleted"})
}

func (h *handler) listSessionsByClass(c *gin.Context) {
	id, ok := uuidParam(c, "id", "invalid class id")
	if !ok {
		return
	}
	actor, ok := actorOrAbort(c)
	if !ok {
		return
	}
	rows, err := h.service.ListSessionsByClass(c, actor, id)
	if err != nil {
		c.JSON(statusForError(err, http.StatusInternalServerError), gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rows)
}

func (h *handler) listSessionsByDate(c *gin.Context) {
	date := c.Query("date")
	if date == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "date query parameter is required"})
		return
	}
	actor, ok := actorOrAbort(c)
	if !ok {
		return
	}
	rows, err := h.service.ListSessionsByDate(c, actor, date)
	if err != nil {
		c.JSON(statusForError(err, http.StatusBadRequest), gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rows)
}

func (h *handler) markAttendance(c *gin.Context) {
	id, ok := uuidParam(c, "id", "invalid session id")
	if !ok {
		return
	}
	var req MarkAttendanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	actor, ok := actorOrAbort(c)
	if !ok {
		return
	}
	if err := h.service.MarkAttendance(c, actor, id, req); err != nil {
		c.JSON(statusForError(err, http.StatusBadRequest), gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "attendance marked"})
}

func (h *handler) listBySession(c *gin.Context) {
	id, ok := uuidParam(c, "id", "invalid session id")
	if !ok {
		return
	}
	actor, ok := actorOrAbort(c)
	if !ok {
		return
	}
	rows, err := h.service.ListBySession(c, actor, id)
	if err != nil {
		c.JSON(statusForError(err, http.StatusInternalServerError), gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rows)
}

func (h *handler) listByStudent(c *gin.Context) {
	id, ok := uuidParam(c, "id", "invalid student id")
	if !ok {
		return
	}
	actor, ok := actorOrAbort(c)
	if !ok {
		return
	}
	rows, err := h.service.ListByStudentForTeacher(c, actor, id)
	if err != nil {
		c.JSON(statusForError(err, http.StatusInternalServerError), gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rows)
}

func (h *handler) summary(c *gin.Context) {
	studentID, ok := uuidParam(c, "id", "invalid student id")
	if !ok {
		return
	}
	classID, ok := uuidParam(c, "class_id", "invalid class id")
	if !ok {
		return
	}
	actor, ok := actorOrAbort(c)
	if !ok {
		return
	}
	result, err := h.service.GetSummaryForTeacher(c, actor, studentID, classID)
	if err != nil {
		c.JSON(statusForError(err, http.StatusInternalServerError), gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}
